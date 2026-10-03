import Soundfont from "soundfont-player";
import {type IPlayer, PlaySession} from "./PlaySession";
import {isPlaybackNote, type PlaybackEvent} from "../fastXml/playback";
import type {PlayHead} from "./PlayHead";
import {
    getPrimaryMidiInstrument,
    getPrimaryScoreInstrument,
    xmlPitchToMidi,
    type XmlScorePart
} from "../fastXml/helpers";
import type { InstrumentName } from "soundfont-player";

const GM_INSTRUMENT_MAP: Record<string, InstrumentName> = {
    piano: "acoustic_grand_piano",
    grand: "acoustic_grand_piano",
    violin: "violin",
    viola: "viola",
    cello: "cello",
    flute: "flute",
    piccolo: "piccolo",
    oboe: "oboe",
    clarinet: "clarinet",
    bassoon: "bassoon",
    trumpet: "trumpet",
    trombone: "trombone",
    tuba: "tuba",
    horn: "french_horn",
    sax: "alto_sax",
    choir: "choir_aahs",
    voice: "choir_aahs",
    guitar: "acoustic_guitar_nylon",
    bass: "acoustic_bass",
    organ: "drawbar_organ",
    harp: "orchestral_harp",
    bells: "tubular_bells",
};

export function resolveInstrumentName(part: XmlScorePart): InstrumentName {
    const scoreInstr = getPrimaryScoreInstrument(part);
    const midiInstr = getPrimaryMidiInstrument(part);

    // 1. instrument-name
    const instrName = scoreInstr?.["instrument-name"]?.toLowerCase();
    if (instrName) {
        for (const key of Object.keys(GM_INSTRUMENT_MAP)) {
            if (instrName.includes(key)) {
                return GM_INSTRUMENT_MAP[key];
            }
        }
    }

    // 2. instrument-sound
    const instrSound = midiInstr?.["instrument-sound"]?.toLowerCase();
    if (instrSound) {
        for (const key of Object.keys(GM_INSTRUMENT_MAP)) {
            if (instrSound.includes(key)) {
                return GM_INSTRUMENT_MAP[key];
            }
        }
    }

    // 3. part-name
    const partName = part["part-name"]?.toLowerCase();
    if (partName) {
        for (const key of Object.keys(GM_INSTRUMENT_MAP)) {
            if (partName.includes(key)) {
                return GM_INSTRUMENT_MAP[key];
            }
        }
    }

    // 4. midi-program
    const program = midiInstr?.["midi-program"];
    if (program != null) {
        if (program >= 0 && program <= 7) return "acoustic_grand_piano";
        if (program >= 40 && program <= 47) return "violin";
        if (program >= 73 && program <= 79) return "flute";
        if (program >= 52 && program <= 55) return "choir_aahs";
    }

    // 5. fallback
    return "acoustic_grand_piano";
}


export interface ISoundFontInstrument {
    /** Output GainNode used internally by soundfont-player */
    out: GainNode;

    play(
        note: number | string,
        when?: number,
        options?: {
            duration?: number;
            gain?: number;
        }
    ): void;
}

export class InstrumentBank {
    private ac: AudioContext | null = null;
    private cache: Map<string, ISoundFontInstrument> = new Map();
    private partInstruments: Map<number, ISoundFontInstrument> = new Map();

    private hasAudioContext = false;

    constructor() {
    }

    getAudioContext(): AudioContext | null {
        return this.ac;
    }

    async loadInstrumentForPart(partIndex: number, gmName: InstrumentName) {

        // this needs to happen in response to a user interaction
        if(!this.hasAudioContext)
        {
            this.ac = new AudioContext();
            this.hasAudioContext = true;
            console.log("AudioContext state:", this.ac.state);
        }

        if(!this.ac) return;

        let inst = this.cache.get(gmName);

        if (!inst) {
            const start = performance.now();
            console.log(`[InstrumentBank] Downloading GM instrument: ${gmName}`);

            const raw = await Soundfont.instrument(this.ac, gmName);

            // Narrow cast ONLY to the fields you actually expose in your interface
            inst = raw as unknown as ISoundFontInstrument;

            const end = performance.now();
            console.log(`[InstrumentBank] Finished downloading ${gmName} in ${(end - start).toFixed(0)}ms`);

            // Now fully typed because your interface includes `out: GainNode`
            inst.out.connect(this.ac.destination);

            this.cache.set(gmName, inst);
        }


        this.partInstruments.set(partIndex, inst);
    }

    getInstrument(partIndex: number): ISoundFontInstrument | undefined {
        return this.partInstruments.get(partIndex);
    }

    now(): number {
        if(!this.ac) return 0;
        return this.ac.currentTime;
    }
}

export class SoundFontPlayer implements IPlayer {
    private ac: AudioContext;
    private timer: ReturnType<typeof setTimeout> | null = null;
    private isPlaying = false;
    private lastTime = 0;

    private notes: PlaybackEvent[][] = [];
    private noteIndex = 0;

    constructor(
        private session: PlaySession,
        private playHead: PlayHead,
        private instrumentBank: InstrumentBank
    ) {
        this.ac = new AudioContext();

        this.populateNotes();
        this.session.onChange(() => this.populateNotes());
    }

    private populateNotes() {
        this.notes = this.session.getAllPlaybackEvents();
        this.noteIndex = 0;
        this.lastTime = 0;
    }

    getIsPlaying(): boolean {
        return this.isPlaying;
    }

    private recalcNoteIndex(now: number) {
        let lo = 0;
        let hi = this.notes[0].length - 1;

        while (lo <= hi) {
            const mid = (lo + hi) >> 1;
            if (this.notes[0][mid].timeSeconds < now) {
                lo = mid + 1;
            } else {
                hi = mid - 1;
            }
        }

        this.noteIndex = lo;
    }

    play() {
        this.clearTimer();
        this.isPlaying = true;

        const tick = () => {
            if (!this.isPlaying) return;

            const now = this.playHead.getCurrentTime();

            // Seeking backwards
            if (now < this.lastTime) {
                this.recalcNoteIndex(now);
            }

            this.lastTime = now;

            // Loop start
            if (now < this.playHead.getLoopStart()) {
                this.timer = setTimeout(tick, 10);
                return;
            }

            // Loop end / max time
            if (now > this.playHead.getLoopEnd() ||
                now > this.playHead.getMaxTime()) {
                this.session.playComplete();
                this.pause();
                return;
            }

            // ⭐ EXACT SAME MODEL: part 0 only
            const events = this.notes[0];
            const inst = this.session.instrumentBank.getInstrument(0);

            if (inst) {
                while (
                    this.noteIndex < events.length &&
                    events[this.noteIndex].timeSeconds <= now
                    ) {
                    const ev = events[this.noteIndex];

                    if (isPlaybackNote(ev) && ev.note.pitch !== null) {
                        const midi = xmlPitchToMidi(ev.note.pitch);

                        // EXACT SAME SCHEDULING MODEL
                        const start = this.session.instrumentBank.now() +
                            (ev.timeSeconds - now);

                        console.log("instrument", inst);

                        console.log(
                            "AudioContext state:",
                            this.session.instrumentBank.getAudioContext()?.state ?? "no context"
                        );

                        console.log("start:", start, "ctx:", this.ac.currentTime);

                        inst.play(midi, start, {
                            duration: ev.durationSeconds,
                            gain: 0.8 // ev.velocity ?? 0.8
                        });

                        console.log(
                            `t: ${now} midi ${xmlPitchToMidi(ev.note.pitch)} dur ${ev.durationSeconds}`
                        );
                    }

                    this.noteIndex++;
                }
            }

            this.timer = setTimeout(tick, 10);
        };

        tick();
    }


    seek(time: number) {
        const idx = this.notes[0].findIndex(n => n.timeSeconds >= time);
        this.noteIndex = idx === -1 ? this.notes[0].length : idx;

        if (this.isPlaying) {
            this.play();
        }
    }

    private clearTimer() {
        if (this.timer !== null) {
            clearTimeout(this.timer);
            this.timer = null;
        }
    }

    pause() {
        this.isPlaying = false;
        this.clearTimer();
    }
}