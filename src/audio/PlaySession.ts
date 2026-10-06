import type {ManifestTrack} from '../useManifest';
import {AudioPlayer} from "./AudioPlayer";
import {PlayHead} from "./PlayHead";
import {Mic} from "./Mic";
import JSZip from "jszip";
import {TonePlayer} from "./TonePlayer";
import {getPartList, getTitle, type XmlScorePartwise} from "../fastXml/helpers";
import {
    getEventsForPart, getPlayback,
    getPlaybackScoreLengthSeconds,
    getStartingTempoFromPlayback, type PlaybackEvent
} from "../fastXml/playback";
import { XMLParser } from "fast-xml-parser";
import {type AudioChannel, buildScoreChannels} from "../fastXml/channels";
import {InstrumentBank, resolveInstrumentName, SoundFontPlayer} from "./SoundFontPlayer";
import {getMergedTimeline} from "../fastXml/timeline";

export const BASE_URL = "https://raw.githubusercontent.com/FenBoy/GlobalVoices/main";

export interface IPlayer {
    play(): void;
    pause(): void;
    seek(time: number): void;
    getIsPlaying(): boolean;
}

export enum MusicFormat {
    None = "none",
    MusicXml = "musicxml",
    Audio = "audio"
}

export class Results
{
    // scores
    goldScore: number = 0;
    silverScore: number = 0;
    bronzeScore: number = 0;
    penaltyScore: number = 0;

    resetScore()
    {
        this.goldScore = 0;
        this.silverScore = 0;
        this.bronzeScore = 0;
        this.penaltyScore = 0;
        this.shown = false;
    }

    shown: boolean = false;

    markShown() {
        this.shown = true;
    }

    hasBeenShown() {
        return this.shown;
    }

    getTotalScore() {
        return ((this.goldScore * 3) + (this.silverScore * 2) + this.bronzeScore - this.penaltyScore);
    }

    getGoldScore() : number
    {
        return this.goldScore;
    }

    addGold()
    {
        this.goldScore++;
    }

    getSilverScore() {
        return this.silverScore;
    }

    addSilver()
    {
        this.silverScore++;
    }

    getBronzeScore(): number{
        return this.bronzeScore;
    }

    addBronze()
    {
        this.bronzeScore++;
    }

    getPenaltyScore() : number {
        return this.penaltyScore;
    }

    addPenalty()
    {
        this.penaltyScore++;
    }
}

export class PlaySession {
    private pitch: number = 0;
    private latency: number = 0;

    private refFormat:MusicFormat = MusicFormat.None;
    // private referenceMusicXml : XmlScore | null = null;

    // this will be the MusicXml data converted into
    // concrete classes
    private referenceScore: XmlScorePartwise | null = null;
    private playbackEvents:PlaybackEvent[] = [];

    // stored here for visualisation
    private backingFormat: MusicFormat = MusicFormat.None;
    private backingAudio: AudioBuffer | null = null;

    // re-enable
    private selectedChannel : number = -1;

    private trackTitle : string = "";
    private player :IPlayer | null = null;
    private visualiser : IPlayer | null = null;
    private playHead : PlayHead;

    private results:Results;

    // microphone
    private mic: Mic;
    private isMicOn: boolean = false;

    // time and pitch modification
    private timeScale: number = 1.0;
    private pitchShift: number = 0;
    private startTempo = 120;
    private currentTempo: number = 120;

    private changeListeners: Array<() => void> = [];

    private scaleListeners: Array<() => void> = [];

    // zoom level
    private zoomFactor:number = 1;

    channels: AudioChannel[] = [];

    // instruments
    instrumentBank: InstrumentBank;

    private trackReady = false;

    isTrackReady() {
        return this.trackReady;
    }

    onChange(cb: () => void) {
        this.changeListeners.push(cb);
    }

    private emitChange() {
        for (const cb of this.changeListeners) cb();
    }

    onScale(cb: () => void) {
        this.scaleListeners.push(cb);
    }

    private emitScale()
    {
        for (const cb of this.scaleListeners) cb();
    }

    getChannels(): AudioChannel[] {
        return this.channels;
    }

    setChannels(channels: AudioChannel[]) {
        this.channels = channels;
    }

    setSelectedChannelIndex(index:number) {
        this.selectedChannel = index;
    }

    getSelectedChannelIndex(): number {
        return this.selectedChannel;
    }

    getSelectedPlaybackEvents() : PlaybackEvent[] {
        if(this.selectedChannel >= 0 && this.channels.length > this.selectedChannel)
        {
            const part = this.channels[this.selectedChannel].part;
            return getEventsForPart(this.playbackEvents, part["@_id"]);
        }
        return [];
    }

    getAllPlaybackEvents(): PlaybackEvent[] {
        return this.playbackEvents;
    }

    getTrackTitle()
    {
        return this.trackTitle;
    }

    getChannelTitle() {
        const channel = this.channels[this.selectedChannel];
        const pn = channel.part.partName;
        if (pn != null) return pn;
        return this.selectedChannel.toString();
    }


    constructor() {
        this.playHead = new PlayHead();
        this.mic = new Mic();
        this.results = new Results();
        this.instrumentBank = new InstrumentBank();
    }

    getResults(): Results {
        return this.results;
    }

    getBackingMusicXml() : XmlScorePartwise | null {
        return this.referenceScore;
    }

    getReferenceMusicXml() : XmlScorePartwise | null {
        return this.referenceScore;
    }

    getPlaybackEvents() : PlaybackEvent[] {
        return this.playbackEvents;
    }

    async setMicState(isRecording: boolean): Promise<void> {
        this.isMicOn = isRecording;
        if(this.isMicOn)
        {
            await this.mic.start();

            this.mic.onPitch((pitch) => {
                this.pitch = pitch;
            });
        }
        else
        {
            this.mic.stop();
        }
    }

    setVisualiser(vis: IPlayer): void {
        this.visualiser = vis;
    }

    private getExtension(path: string): string {
        const idx = path.lastIndexOf(".");
        if (idx === -1) return "";
        return path.substring(idx + 1).toLowerCase();
    }

    private populatePlayData() {

        this.refFormat = MusicFormat.MusicXml;

        const maxTime: number = getPlaybackScoreLengthSeconds(this.playbackEvents);

        this.playHead.setMaxTime(maxTime);
        this.playHead.setLoopStart(0);
        this.playHead.setLoopEnd(maxTime);

        this.startTempo = getStartingTempoFromPlayback(this.playbackEvents);
        this.currentTempo = this.startTempo;
    }

    async loadInstruments(score: XmlScorePartwise) {
        const scoreParts = getPartList(score);

        for (const part of scoreParts) {
            const gmName = resolveInstrumentName(part);
            await this.instrumentBank.loadInstrumentForPart(part["@_id"], gmName);
        }
    }

    async loadTrack(track: ManifestTrack) {
        const referenceUrl = `${BASE_URL}${track.reference}`;

        this.trackReady = false;

        // reference is now either MusicXml or Mxl
        const referenceExtension = this.getExtension(track.reference);

        switch(referenceExtension)
        {
            case "musicxml":
            {
                const xml:XmlScorePartwise = await this.loadMusicXmlScoreUrl(referenceUrl);
                await this.load(xml);
            }
                break;
            case "mxl":
            {
                const xml:XmlScorePartwise = await this.loadMxlScore(referenceUrl);
                await this.load(xml);
            }
                break;
            default:
                this.refFormat = MusicFormat.None;
                // no point continuing
                return;
        }

        // track.parts are now used for audio
        // i.e. backing tracks
        if(track.parts != null)
        {
            // add code for the backing tracks
        }
        else
        {
            // use the reference as the backing
            // add this back with new XmlScorePartwise
            // this.setBackingParts(this.referenceScore.partInfo);
            // this.player = new TonePlayer(this, this.playHead);
            this.player = new SoundFontPlayer(this, this.playHead, this.instrumentBank);
        }
    }

    private async load(xml: XmlScorePartwise) {
        // const expanded:XmlScore = expandScoreRepeats(xml);
        // this.referenceScore = createMidiScore(expanded);
        this.referenceScore = xml;
        this.trackTitle = getTitle(xml);
        const timeLine = getMergedTimeline(xml);
        this.playbackEvents = getPlayback(timeLine);
        this.channels = buildScoreChannels(this.referenceScore);
        this.populatePlayData();
        await this.loadInstruments(xml);
        this.trackReady = true;
    }

    getZoomFactor(): number {
        return this.zoomFactor;
    }

    setZoomFactor(zoomFactor: number) {
        this.zoomFactor = zoomFactor;
        this.emitScale();
    }

    getTimeScale() : number
    {
        return this.timeScale;
    }

    getTempo()
    {
        return this.currentTempo;
    }

    setTempo(tempo:number)
    {
        this.currentTempo = tempo;
        this.timeScale = this.startTempo / this.currentTempo;
        // maybe change the time values here
        this.emitChange();
    }

    getPitchShift() : number
    {
        return this.pitchShift;
    }

    setPitchShift(shift:number)
    {
        this.pitchShift = shift;
        this.emitChange();
    }

    getLoopStart() : number
    {
        return this.playHead.getLoopStart();
    }

    setLoopStart(time: number): void {
        this.playHead.setLoopStart(time);
    }

    getLoopEnd() : number
    {
        return this.playHead.getLoopEnd();
    }

    setLoopEnd(time: number): void {
        this.playHead.setLoopEnd(time);
    }

    loadMusicXmlString(xmlString: string): XmlScorePartwise {
        const parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: "@_",
            allowBooleanAttributes: true,
            parseAttributeValue: false,
            preserveOrder: false
        });

        const json = parser.parse(xmlString);

        return json["score-partwise"] as XmlScorePartwise;
    }

    async loadMxlScore(url: string): Promise<XmlScorePartwise> {
        const data = await fetch(url).then(r => r.arrayBuffer());
        const zip = await JSZip.loadAsync(data);

        const file = zip.file("score.xml");
        if (!file) throw new Error("MXL file does not contain score.xml");

        const xmlText = await file.async("string");

        return this.loadMusicXmlString(xmlText);
    }


    async loadMusicXmlScoreUrl(url: string): Promise<XmlScorePartwise> {
        const res = await fetch(url);
        const xmlText = await res.text();
        return this.loadMusicXmlString(xmlText);
    }


    // re-enable this
    // getPartName():string | null
    // {
    //     if(this.selectedPart != null) return this.selectedPart.name;
    //     return null;
    // }

    getReferenceFormat() : MusicFormat
    {
        return this.refFormat;
    }

    getBackingFormat() : MusicFormat
    {
        return this.backingFormat;
    }

    isAudio(): boolean {
        return this.player instanceof AudioPlayer;
    }

    isMidi(): boolean {
        return this.player instanceof TonePlayer;
    }


    // so we can visualize it
    // getBackingMidi(): Midi | null {
    //     return this.backingMidi;
    // }

    // so we can visualize it
    getBackingAudio() : AudioBuffer | null {

        if (this.player instanceof AudioPlayer) {
            return this.player.getAudioBuffer();
        }

        return null;
    }

    getBackingScore() : XmlScorePartwise | null {
        return this.referenceScore;
    }

    getIsPlaying() : boolean {

        if(this.player != null) {
            return this.player.getIsPlaying()
        }

        return false;
    }

    getMaxTime()
    {
        return this.playHead.getMaxTime();
    }

    getCurrentTime(): number {
        return this.playHead.getCurrentTime();
    }

    isAtEnd()
    {
        if(this.playHead.getCurrentTime() >= this.playHead.getMaxTime())
        {
            return true;
        }
    }

    // The microphone response will be later
    // than the time the note was played
    // so we will need to adjust for latency
    // either by getting the user to help up
    // (by singing/tapping)
    // or making an estimate

    // getCorrectedTime() : number{
    //     return this.getCurrentTime() - this.latency;
    // }

    setLatency(time: number) {
        this.latency = time;
    }

    getPitch() {
        return this.pitch;
    }

    getIsMicOn():boolean
    {
        return this.isMicOn;
    }

    getMicVolume() {
        return this.mic.getVolume();
    }

    playMidi(midi: number) {
        const inst = this.instrumentBank.getDefaultInstrument();
        if(inst)
        {
            inst.play(midi, this.instrumentBank.now(), {
                duration: 1,
                gain: 0.8 // ev.velocity ?? 0.8
            });
        }
    }

    // pass on the play controls

    play()
    {
        // switch on microphone and receive events
        this.setMicState(true);

        const current =this.playHead.getCurrentTime();

        if(current < this.playHead.getLoopStart() || current > this.playHead.getLoopEnd())
        {
            this.seek(this.playHead.getLoopStart());
        }

        if(this.player)
        {
            this.player.play();
        }

        this.playHead.start();
        //this.results.resetScore();
    }

    pause()
    {
        this.playHead.stop();
        if(this.player) this.player.pause();
    }

    seek(time: number)
    {
        if(time < 0)
        {
            this.playHead.seek(0);
            if(this.player) this.player.seek(0);
            if(this.visualiser) this.visualiser.seek(0);
            return;
        }

        const maxTime = this.playHead.getMaxTime();
        if(time > maxTime)
        {
            this.playHead.seek(maxTime);
            if(this.player) this.player.seek(maxTime);
            if(this.visualiser) this.visualiser.seek(maxTime);
            return;
        }

        this.playHead.seek(time);
        if(this.player) this.player.seek(time);
        if(this.visualiser) this.visualiser.seek(time);
    }

    // called from the player
    playComplete()
    {

    }
}
