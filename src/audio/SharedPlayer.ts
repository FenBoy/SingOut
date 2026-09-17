import * as Tone from "tone";
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

    // looping
    private loopStart : number = 0;
    private loopEnd: number = 0;

    constructor(session: PlaySession) {
        this.session = session;
        // parameters can be given to the synth
        this.synth = new Tone.PolySynth(Tone.Synth);
        this.synth.toDestination();
    }

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

        // play everything unless otherwise directed
        this.setLoopStart(0);
        this.setLoopEnd(this.maxTime);
    }

    //
    setMaxTime(time: number) {
        this.maxTime = time;
    }

    getMaxTime(): number {
        return this.maxTime;
    }

    getLoopStart() : number
    {
        return this.loopStart;
    }

    setLoopStart(time: number): void {
        this.loopStart = time;
    }

    getLoopEnd() : number
    {
        return this.loopEnd;
    }

    setLoopEnd(time: number): void {
        this.loopEnd = time;
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

            if(now < this.loopStart) return;

            if (now > this.maxTime || now > this.loopEnd) {
                this.session.playComplete();
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