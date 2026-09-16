import * as Tone from "tone";
import type {Midi} from "@tonejs/midi";
import * as MidiUtils from "../midi/midiUtils";
import type {Note, ScoreModel} from "./Types";
import {type IPlayer, PlaySession} from "./PlaySession";

// plays midi or music xml

export class SharedPlayer implements IPlayer{
    private synth: Tone.PolySynth;
    session: PlaySession;
    private timer: ReturnType<typeof setTimeout> | null = null;
    private isPlaying : boolean = false;

    notes: Note[] = [];
    maxTime: number = 0;

    constructor(session: PlaySession) {
        this.session = session;
        // parameters can be given to the synth
        this.synth = new Tone.PolySynth(Tone.Synth);
        this.synth.toDestination();
    }

    // no longer support midi
    // setMidi(midi: Midi) {
    //     this.notes = MidiUtils.mergeTies(MidiUtils.flattenToMidiNotes(midi));
    //     const latestNote = this.notes.reduce(
    //         (a, b) => (a.start > b.start ? a : b)
    //     );
    //
    //     this.maxTime = latestNote.start + latestNote.duration;
    // }

    setMusicXml(model: ScoreModel) {
        this.notes = model.notes
            .map(n => ({
                midi: n.pitch,
                start: n.startTime,
                duration: n.duration,
                measureIndex: n.measureIndex,
                velocity: 0.8,
                partIndex: n.partIndex,
                lyric: n.lyric ?? null
            }) satisfies Note);

        this.notes.sort((a, b) => a.start - b.start);

        // console.log("PARTS FOUND:", new Set(this.notes.map(n => n.partIndex)));

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

    getIsPlaying():boolean{
        return this.isPlaying;
    }

    play() {
        this.clearTimer();
        this.isPlaying = true;

        let index = 0;

        const tick = () => {
            const now = this.session.getCurrentTime();

            if (now > this.maxTime) {
                this.isPlaying = false;
                this.session.pause();
                return;
            }

            // Trigger notes in order
            while (index < this.notes.length && this.notes[index].start <= now) {
                const n = this.notes[index];

                // console.log(
                //     "FIRE:",
                //     "part:", n.partIndex,
                //     "midi:", n.midi,
                //     "start:", n.start.toFixed(4),
                //     "duration:", n.duration.toFixed(4),
                //     "index", index
                // );

                this.synth.triggerAttackRelease(
                    Tone.Frequency(n.midi, "midi").toFrequency(),
                    n.duration,
                    undefined,
                    n.velocity
                );

                index++;
            }

            this.timer = setTimeout(tick, 10);
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