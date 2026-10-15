import {hasPitch, isPlaybackNote, type PlaybackEvent} from "../fastXml/playback";
import {xmlPitchToMidi} from "../fastXml/helpers";
import {type IPlayer, PlaySession} from "./PlaySession";
import type {PlayHead} from "./PlayHead";
import type {InstrumentBank} from "./InstrumentBank";

export class ClockedPlayer implements IPlayer {
    private isPlaying = false;

    private audioStartTime = 0;
    private musicalStartTime = 0;

    private lastScheduledTime = -Infinity;

    private readonly LOOKAHEAD = 0.3;

    private notes: PlaybackEvent[] = [];

    // NEW: audio tick handle
    private audioTickHandle: number | null = null;

    private lastIndex = 0;

    constructor(
        private session: PlaySession,
        private readonly playHead: PlayHead,
        private readonly instrumentBank: InstrumentBank
    ) {
        this.populateNotes();
        this.session.onChange(() => this.populateNotes());
    }

    private populateNotes() {
        this.notes = this.session.getAllPlaybackEvents();
        this.lastScheduledTime = -Infinity;
    }

    getIsPlaying(): boolean {
        return this.isPlaying;
    }

    play(): void {
        if (this.isPlaying) return;
        this.isPlaying = true;

        const audioNow = this.session.audioNow();   // CHANGED: use PlaySession clock
        const musicalNow = this.playHead.getCurrentTime();

        this.audioStartTime = audioNow;
        this.musicalStartTime = musicalNow;
        this.lastScheduledTime = musicalNow;

        // START AUDIO TICK LOOP (25ms)
        this.audioTickHandle = window.setInterval(() => this.tick(), 25);
    }

    pause(): void {
        this.isPlaying = false;
        this.session.stopAllInstruments();
        this.lastScheduledTime = -Infinity;

        if (this.audioTickHandle !== null) {
            clearInterval(this.audioTickHandle);
            this.audioTickHandle = null;
        }
    }

    stop(): void {
        this.isPlaying = false;
        this.session.stopAllInstruments();

        this.lastScheduledTime = -Infinity;
        this.playHead.setCurrentTime(0);
        this.lastIndex = 0;

        this.audioStartTime = this.session.audioNow();
        this.musicalStartTime = 0;

        if (this.audioTickHandle !== null) {
            clearInterval(this.audioTickHandle);
            this.audioTickHandle = null;
        }
    }

    seek(time: number): void {
        this.playHead.setCurrentTime(time);

        this.audioStartTime = this.session.audioNow();
        this.musicalStartTime = time;
        this.lastScheduledTime = time;

        // Reset scheduling
        this.lastIndex = this.findEventIndex(time);

        // Reset transport state
        this.lastScheduledTime = -Infinity;
    }

    //
    // AUDIO TICK LOOP (stable scheduling)
    //
    private tick(): void {
        if (!this.isPlaying) return;

        let currentTime = this.musicalStartTime + (this.session.audioNow() - this.audioStartTime);

        if (currentTime >= this.playHead.getMaxTime()) {
            this.isPlaying = false;
            return;
        }

        // Looping
        const loopStart = this.playHead.getLoopStart();
        const loopEnd   = this.playHead.getLoopEnd();

        if (currentTime >= loopEnd) {
            this.musicalStartTime = loopStart;
            this.audioStartTime = this.session.audioNow();
            this.lastScheduledTime = loopStart;
            currentTime = loopStart;
            this.lastIndex = this.findEventIndex(loopStart);
        }

        // update the playhead
        this.playHead.setCurrentTime(currentTime);

        this.scheduleWindow(currentTime, this.session.audioNow());
    }

    private scheduleWindow(now: number, audioNow: number): void {
        const cutoff = now + this.LOOKAHEAD;

        while (this.lastIndex < this.notes.length) {
            const ev = this.notes[this.lastIndex];
            const t = ev.timeSeconds;

            console.log(this.lastIndex, this.notes[this.lastIndex]);

            // If event is beyond the window, stop.
            if (t > cutoff) break;

            // If event is behind the window, skip it.
            if (t < now) {
                this.lastIndex++;
                console.log("skipping", this.lastIndex);
                continue;
            }

            // Schedule notes
            if (isPlaybackNote(ev) && hasPitch(ev)) {
                const midi = xmlPitchToMidi(ev.note.pitch);
                const inst = this.session.getInstrumentForPart(ev.id);

                if (inst) {
                    const dt = t - now;
                    const start = audioNow + dt;

                    inst.play(midi, start, {
                        duration: ev.durationSeconds,
                        gain: 0.8
                    });

                    console.log("play", midi, ev.durationSeconds);
                }
            }

            this.lastIndex++;
        }
    }

    private findEventIndex(time: number): number {
        let low = 0;
        let high = this.notes.length;

        while (low < high) {
            const mid = (low + high) >>> 1;
            const t = this.notes[mid].timeSeconds;

            if (t <= time) low = mid + 1;
            else high = mid;
        }

        return low;
    }

}


