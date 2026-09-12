import { Midi } from "@tonejs/midi";
import type { Track, Part } from '../useManifest';
import {MidiPlayer} from "./MidiPlayer";
import {AudioPlayer} from "./AudioPlayer";
import {Clock} from "./Clock";
import { Mic } from "./Mic";
import {MusicXmlPlayer} from "./MusicXmlPlayer";
import {parseMusicXml} from "./ParseMusicXml";
import type {ScoreModel} from "./Types";
import JSZip from "jszip";

export const BASE_URL = "https://raw.githubusercontent.com/FenBoy/GlobalVoices/main";

export interface IPlayer {
    play(): void;
    pause(): void;
    seek(time: number): void;
    getMaxTime(): number;
    getIsPlaying(): boolean;
}

export enum MusicFormat {
    None = "none",
    Midi = "midi",
    MusicXml = "musicxml",
    Audio = "audio"
}


export class PlaySession implements IPlayer {
    private pitch: number = 0;
    private latency: number = 0;

    private refFormat:MusicFormat = MusicFormat.None;
    private referenceMidi: Midi | null = null;
    private referenceMusicXml : ScoreModel | null = null;

    // stored here for visualisation
    private backingFormat: MusicFormat = MusicFormat.None;
    private backingMidi: Midi | null = null;
    private backingAudio: AudioBuffer | null = null;
    private backingMusicXml : ScoreModel | null = null;

    private part: Part;
    private player :IPlayer | null = null;
    private clock : Clock;

    // scores
    private goldScore: number = 0;
    private silverScore: number = 0;
    private bronzeScore: number = 0;
    private penaltyScore: number = 0;

    // microphone
    private mic: Mic;
    private isMicOn: boolean = false;

    // looping
    private loopStart : number = 0;
    private loopEnd: number = 0;

    constructor(track: Track, part: Part) {
        this.part = part;
        this.clock = new Clock();
        this.mic = new Mic();
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

    resetScore()
    {
        this.goldScore = 0;
        this.silverScore = 0;
        this.bronzeScore = 0;
        this.penaltyScore = 0;
    }

    private getExtension(path: string): string {
        const idx = path.lastIndexOf(".");
        if (idx === -1) return "";
        return path.substring(idx + 1).toLowerCase();
    }

    async load() {
        // without a part we can't train the singer
        const referenceUrl = `${BASE_URL}${this.part.reference}`;

        // the reference can be midi or musicXml
        // we'll add a common interface for them
        const referenceExtension = this.getExtension(this.part.reference);

        switch(referenceExtension)
        {
            case "mid":
            case "midi":
            {
                this.referenceMidi = await this.loadMidi(referenceUrl);
                this.refFormat = MusicFormat.Midi;
            }
            break;
            case "musicxml":
            {
                this.referenceMusicXml = await this.loadMusicXmlScore(referenceUrl);
                this.refFormat = MusicFormat.MusicXml;
            }
            break;
            case "mxl":
            {
                this.referenceMusicXml = await this.loadMxlScore(referenceUrl);
                this.refFormat = MusicFormat.MusicXml;
            }
            break;
            default:
                this.refFormat = MusicFormat.None;
                // no point continuing
                return;
        }

        // just add the reference when the backing is empty
        if(this.part.backing == null)
        {
            this.part.backing = this.part.reference;
            this.backingFormat = this.refFormat;
        }

        if(this.part.backing == this.part.reference)
        {
            switch(referenceExtension)
            {
                case "mid":
                case "midi": {
                    if(this.referenceMidi!= null) {
                        // don't load it again
                        this.backingMidi = this.referenceMidi;
                        this.backingFormat = this.refFormat;
                        const midi = new MidiPlayer(this);
                        midi.setMidi(this.backingMidi);
                        this.player = midi;
                        this.loopStart = 0;
                        this.loopEnd = midi.getMaxTime();
                    }
                }
                break;
                case "musicxml":
                case "mxl":
                {
                    if(this.referenceMusicXml != null)
                    {
                        // don't load it again
                        this.backingMusicXml = this.referenceMusicXml;
                        this.backingFormat = this.refFormat;
                        const musicXml = new MusicXmlPlayer(this);
                        musicXml.setMusicXml(this.backingMusicXml);
                        this.player = musicXml;
                        this.loopStart = 0;
                        this.loopEnd = musicXml.getMaxTime();
                    }

                    // add code here
                }
                break;
                default:
                    // no point continuing
                    return;
            }
        }
        else
        {
            // the backing is a different file.
            // audio files are also acceptable here
            const backingUrl = `${BASE_URL}${this.part.backing}`;
            const backingExtension = this.getExtension(this.part.backing);

            switch(backingExtension)
            {
                case "mid":
                case "midi":
                {
                    this.backingMidi = await this.loadMidi(backingUrl);
                    this.backingFormat = MusicFormat.Midi;
                    const midi = new MidiPlayer(this);
                    midi.setMidi(this.backingMidi);
                    this.player = midi;
                    this.loopStart = 0;
                    this.loopEnd = midi.getMaxTime();
                }
                    break;

                case "musicxml":
                {
                    this.backingMusicXml = await this.loadMusicXmlScore(backingUrl);
                    this.backingFormat = MusicFormat.MusicXml;
                    const musicXml = new MusicXmlPlayer(this);
                    musicXml.setMusicXml(this.backingMusicXml);
                    this.player = musicXml;
                    this.loopStart = 0;
                    this.loopEnd = musicXml.getMaxTime();
                }
                break;

                case "mxl":
                {
                    this.backingMusicXml = await this.loadMxlScore(backingUrl);
                    this.backingFormat = MusicFormat.MusicXml;
                    const musicXml = new MusicXmlPlayer(this);
                    musicXml.setMusicXml(this.backingMusicXml);
                    this.player = musicXml;
                    this.loopStart = 0;
                    this.loopEnd = musicXml.getMaxTime();
                }
                break;

                case "mp3":
                {
                    // we are going to play audio
                    const response = await fetch(backingUrl);
                    const arrayBuffer = await response.arrayBuffer();
                    const offline = new OfflineAudioContext(1, 1, 44100);
                    this.backingAudio = await offline.decodeAudioData(arrayBuffer);
                    this.backingFormat = MusicFormat.Audio;
                    const audio = new AudioPlayer(this);
                    audio.setAudio(this.backingAudio);
                    this.player = audio;
                    this.loopStart = 0;
                    this.loopEnd = audio.getMaxTime();
                }
                    break;
                default:
                    return;
            }
        }
    }

    getLoopStart() : number
    {
        return this.loopStart;
    }

    setLoopStart(time: number): void {
        this.loopStart = time;

        if(this.loopStart > this.getCurrentTime())
        {
            this.setCurrentTime(this.loopStart);
        }
    }

    getLoopEnd() : number
    {
        return this.loopEnd;
    }

    setLoopEnd(time: number): void {
        this.loopEnd = time;

        if(this.loopEnd > this.getCurrentTime())
        {
            this.setCurrentTime(this.loopEnd);
        }
    }

    async loadMxlScore(url:string):Promise<ScoreModel> {
        // Load the .mxl file (ZIP)
        const data = await fetch(url).then(r => r.arrayBuffer());
        const zip = await JSZip.loadAsync(data);

        // MusicXML inside MXL is usually named "score.xml"
        const file = zip.file("score.xml");
        if (!file) throw new Error("MXL file does not contain score.xml");

        // Extract XML text
        const xmlText = await file.async("string");

        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, "application/xml");

        // ⭐ This is the important line
        return parseMusicXml(xmlDoc);
    }

    async loadMusicXmlScore(url: string): Promise<ScoreModel> {
        const res = await fetch(url);
        const xmlText = await res.text();

        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, "application/xml");

        // ⭐ This is the important line
        return parseMusicXml(xmlDoc);
    }

    getPart()
    {
        if(this.part.part != null)
        {
            return this.part.part;
        }
        return -1;
    }

    async loadMidi(url: string): Promise<Midi> {
        const res = await fetch(url);
        const arrayBuffer = await res.arrayBuffer();
        return new Midi(arrayBuffer);
    }

    getReferenceFormat() : MusicFormat
    {
        return this.refFormat;
    }

    getBackingFormat() : MusicFormat
    {
        return this.backingFormat;
    }

    getReferenceMidi(): Midi {
        if (!this.referenceMidi) throw new Error("MIDI not loaded yet");
        return this.referenceMidi;
    }

    getReferenceScore() : ScoreModel {
        if(!this.referenceMusicXml) throw new Error("MusicXML not loaded yet");
        return this.referenceMusicXml;
    }

    isAudio(): boolean {
        return this.player instanceof AudioPlayer;
    }

    isMidi(): boolean {
        return this.player instanceof MidiPlayer || this.player instanceof MusicXmlPlayer;
    }


    // so we can visualize it
    getBackingMidi(): Midi | null {
        return this.backingMidi;
    }

    // so we can visualize it
    getBackingAudio() : AudioBuffer | null {

        if (this.player instanceof AudioPlayer) {
            return this.player.getAudioBuffer();
        }

        return null;
    }

    getBackingScore() : ScoreModel | null {
        return this.backingMusicXml;
    }

    getIsPlaying() : boolean {

        if(this.player != null) {
            return this.player.getIsPlaying()
        }

        return false;
    }

    setCurrentTime(time: number) {
        this.clock.setTime(time);
    }

    getMaxTime()
    {
        if(this.player) return this.player.getMaxTime();
        return 0;
    }

    getCurrentTime(): number {
        return this.clock.getTime();
    }

    // The microphone response will be later
    // than the time the note was played
    // so we will need to adjust for latency
    // either by getting the user to help up
    // (by singing/tapping)
    // or making an estimate

    getCorrectedTime() : number{
        return this.getCurrentTime() - this.latency;
    }

    setLatency(time: number) {
        this.latency = time;
    }

    getPitch() {
        return this.pitch;
    }

    getMicVolume() {
        return this.mic.getVolume();
    }

    // pass on the play controls

    play()
    {
        this.clock.start();
        this.resetScore();
        if(this.player) this.player.play();
        // if(this.isRecording) this.mic.startRecording();
    }

    pause()
    {
        this.clock.pause();
        if(this.player) this.player.pause();
        // if(this.isRecording) this.mic.stopRecording();
    }

    seek(time: number)
    {
        this.clock.seek(time);
        if(this.player) this.player.seek(time);
    }

    // called from the player
    playComplete()
    {
        this.clock.pause();
    }
}
