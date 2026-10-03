import * as Tone from "tone";
import { type IPlayer, PlaySession } from "./PlaySession";
import type { PlayHead } from "./PlayHead";
import {isPlaybackNote, type PlaybackEvent} from "../fastXml/playback";
import {xmlPitchToMidi} from "../fastXml/helpers";

export class TonePlayer implements IPlayer {
    private synth: Tone.PolySynth;
    private timer: ReturnType<typeof setTimeout> | null = null;
    private isPlaying = false;
    private lastTime = 0;

    private notes: PlaybackEvent[][] = [];
    private noteIndex = 0;

    constructor(
        private session: PlaySession,
        private playHead: PlayHead
    ) {
        this.synth = new Tone.PolySynth({
            voice: Tone.Synth,
            options: {
                oscillator: { type: "sine" },
                envelope: {
                    attack: 0.01,
                    decay: 0.1,
                    sustain: 0.9,
                    release: 0.3
                }
            }
        }).toDestination();

        this.populateNotes();
        this.session.onChange(() => this.populateNotes());
    }

    private populateNotes() {
        // just test with the selected
        this.notes = this.session.getAllPlaybackEvents();
        this.noteIndex = 0;
        this.lastTime = 0;
    }

    getIsPlaying(): boolean {
        return this.isPlaying;
    }

    private recalcNoteIndex(now: number) {
        let lo = 0;
        let hi = this.notes.length - 1;

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

            // Handle backwards seeking
            if (now < this.lastTime) {
                this.recalcNoteIndex(now);
            }

            this.lastTime = now;

            // Respect loop start
            if (now < this.playHead.getLoopStart()) {
                this.timer = setTimeout(tick, 10);
                return;
            }

            // End of playback
            if (now > this.playHead.getMaxTime() ||
                now > this.playHead.getLoopEnd()) {
                this.session.playComplete();
                this.pause();
                return;
            }

            // Fire notes
            while (
                this.noteIndex < this.notes[0].length &&
                this.notes[0][this.noteIndex].timeSeconds <= now
                ) {
                const n = this.notes[0][this.noteIndex];
                const start = Tone.now() + (n.timeSeconds - now);

                if(isPlaybackNote(n)) {
                    if (n.note.pitch !== null) {
                        this.synth.triggerAttackRelease(
                            Tone.Frequency(xmlPitchToMidi(n.note.pitch), "midi").toFrequency(),
                            n.durationSeconds,
                            start,
                            0.5 // add velocity later
                        );

                        console.log(
                            `t: ${now} midi ${xmlPitchToMidi(n.note.pitch)} dur ${n.durationSeconds}`
                        );
                    }
                }

                this.noteIndex++;
            }

            this.timer = setTimeout(tick, 10);
        };

        tick();
    }

    seek(time: number) {
        const idx = this.notes.findIndex(n => n[0].timeSeconds >= time);
        this.noteIndex = idx === -1 ? this.notes.length : idx;

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
