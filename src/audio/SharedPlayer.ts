import * as Tone from "tone";
import type {Note, ScoreModel} from "./Types";
import {type IPlayer, PlaySession} from "./PlaySession";
import type {PlayHead} from "./PlayHead";

// plays midi or music xml

export class SharedPlayer implements IPlayer{
    private synth: Tone.PolySynth;
    session: PlaySession;
    playHead: PlayHead;
    private timer: ReturnType<typeof setTimeout> | null = null;
    private isPlaying : boolean = false;

    notes: Note[] = [];
    private noteIndex: number = 0;

    constructor(session: PlaySession, playHead : PlayHead) {
        this.session = session;
        this.playHead = playHead;
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
    }

    getIsPlaying():boolean{
        return this.isPlaying;
    }

    play() {
        this.clearTimer();
        this.isPlaying = true;

        const tick = () => {

            // stop ticking when the play has stopped
            if(!this.isPlaying) return;

            const now = this.playHead.getCurrentTime();

            if(now < this.playHead.getLoopStart()) return;

            if (now > this.playHead.getMaxTime() || now > this.playHead.getLoopEnd()) {
                this.session.playComplete();
                this.isPlaying = false;
                this.session.pause();
                return;
            }

            // Trigger notes in order
            while (this.noteIndex < this.notes.length && this.notes[this.noteIndex].start <= now) {
                const n = this.notes[this.noteIndex];

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

                this.noteIndex++;
            }

            this.timer = setTimeout(tick, 10);
        };

        tick();
    }

    seek(time: number) {
        const idx = this.notes.findIndex(n => n.start >= time);
        this.noteIndex = idx === -1 ? this.notes.length : idx;

        // If playing, restart the tick loop
        if (this.isPlaying) {
            this.play();
        }
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