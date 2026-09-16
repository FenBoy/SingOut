
/*

    replaced by SharedPlayer

import * as Tone from "tone";
import type {Note, ScoreModel} from "./Types";
import { type IPlayer, PlaySession } from "./PlaySession";
import * as MidiUtils from "../midi/midiUtils";

export class MusicXmlPlayer implements IPlayer {
    private synth: Tone.PolySynth;
    session: PlaySession;
    private timer: ReturnType<typeof setTimeout> | null = null;
    private isPlaying: boolean = false;
    private model: ScoreModel | null = null;

    notes: Note[] = [];

    maxTime: number = 0;

    constructor(session: PlaySession) {
        this.session = session;
        this.synth = new Tone.PolySynth(Tone.Synth).toDestination();
    }

    setMusicXml(model: ScoreModel) {
        this.model = model;

        this.notes = MidiUtils.mergeTies(model.notes
            .map(n => ({
                midi: n.pitch,
                start: n.startTime,
                duration: n.duration,
                velocity: 0.8,
                partIndex: n.partIndex,
                lyric: n.lyric ?? null
            }) satisfies Note));

        // Compute max time
        let max = 0;
        for (const n of this.notes) {
            const end = n.start + n.duration;
            if (end > max) max = end;
        }
        this.maxTime = max;
    }

    getMaxTime(): number {
        return this.maxTime;
    }

    getIsPlaying(): boolean {
        return this.isPlaying;
    }

    play() {
        this.clearTimer();
        this.isPlaying = true;

        const tick = () => {
            const now = this.session.getCurrentTime();

            if (now > this.maxTime) {
                this.isPlaying = false;
                this.session.pause();
            } else {
                // Trigger notes that should start now
                for (const n of this.notes) {
                    if (Math.abs(n.time - now) < 0.01) {
                        this.synth.triggerAttackRelease(
                            Tone.Frequency(n.midi, "midi").toFrequency(),
                            n.duration,
                            undefined,
                            n.velocity
                        );
                    }
                }

                this.timer = setTimeout(tick, 10);
            }
        };

        tick();
    }

    seek(time: number) {
        this.session.seek(time);
    }

    clearTimer() {
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

 */