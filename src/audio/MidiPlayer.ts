import * as Tone from "tone";
import type {Midi} from "@tonejs/midi";
import * as MidiUtils from "../midi/midiUtils";
import type {Note} from "./Types";
import {type IPlayer, PlaySession} from "./PlaySession";

export class MidiPlayer implements IPlayer{
    private synth: Tone.PolySynth;
    session: PlaySession;
    private timer: ReturnType<typeof setTimeout> | null = null;
    private isPlaying : boolean = false;

    originalNotes: Note[] = [];
    maxTime: number = 0;

    constructor(session: PlaySession) {
        this.session = session;
        this.synth = new Tone.PolySynth(Tone.Synth).toDestination();
    }

    setMidi(midi: Midi) {
        this.originalNotes = MidiUtils.flattenToMidiNotes(midi);
        const latestNote = this.originalNotes.reduce(
            (a, b) => (a.start > b.start ? a : b)
        );

        this.maxTime = latestNote.start + latestNote.duration;
    }

    getMaxTime(): number {
        return this.maxTime;
    }

    getIsPlaying():boolean{
        return this.isPlaying;
    }

    play()
    {
        this.clearTimer();
        this.isPlaying = true;

        const tick = () => {
            const now = this.session.getCurrentTime();

            if(now > this.maxTime)
            {
                this.isPlaying = false;
                this.session.pause();
            }
            else {
                // Trigger notes that should start now
                for (const n of this.originalNotes) {
                    if (Math.abs(n.start - now) < 0.01) {
                        this.synth.triggerAttackRelease(
                            Tone.Frequency(n.midi, "midi").toFrequency(),
                            n.duration,      // duration in seconds
                            undefined,       // start time (undefined = now)
                            n.velocity       // velocity 0–1
                        );
                    }
                }

                this.timer = setTimeout(tick, 10); // 100 Hz scheduling
            }
        };

        tick();
    }

    seek()
    {

    }

    clearTimer()
    {
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
