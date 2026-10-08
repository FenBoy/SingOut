import {type IPlayer, PlaySession} from "./PlaySession";
import {hasPitch, isPlaybackNote, type PlaybackEvent} from "../fastXml/playback";
import type {PlayHead} from "./PlayHead";
import type {InstrumentBank} from "./instrumentBank";
import {xmlPitchToMidi} from "../fastXml/helpers";

export class ClockedPlayer implements IPlayer {
    private isPlaying = false;

    private audioStartTime = 0;
    private musicalStartTime = 0;

    private lastScheduledTime = -Infinity;

    private readonly LOOKAHEAD = 0.20;     // 200ms
    private readonly MIN_OFFSET = 0.03;    // 30ms

    private notes: PlaybackEvent[] = [];

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

        const audioNow = this.instrumentBank.now();
        const musicalNow = this.playHead.getCurrentTime();

        this.audioStartTime = audioNow;
        this.musicalStartTime = musicalNow;
        this.lastScheduledTime = musicalNow;

        requestAnimationFrame(() => this.tick());
    }

    //
    // IPlayer: pause
    //
    pause(): void {
        this.isPlaying = false;
        this.session.stopAllInstruments();
        this.lastScheduledTime = -Infinity;
    }

    //
    // IPlayer: stop
    //
    stop(): void {
        this.isPlaying = false;
        this.session.stopAllInstruments();

        this.lastScheduledTime = -Infinity;
        this.playHead.setCurrentTime(0);

        this.audioStartTime = this.instrumentBank.now();
        this.musicalStartTime = 0;
    }

    //
    // IPlayer: seek
    //
    seek(time: number): void {
        this.playHead.setCurrentTime(time);

        const audioNow = this.instrumentBank.now();
        this.audioStartTime = audioNow;
        this.musicalStartTime = time;

        this.lastScheduledTime = time;
    }

    private tick(): void {
        if (!this.isPlaying) return;

        const audioNow = this.instrumentBank.now();
        const now = this.musicalStartTime + (audioNow - this.audioStartTime);

        if (now >= this.playHead.getMaxTime()) {
            this.isPlaying = false;
            return;
        }

        // Drive PlayHead visually
        this.playHead.setCurrentTime(now);

        // Looping
        const loopStart = this.playHead.getLoopStart();
        const loopEnd   = this.playHead.getLoopEnd();

        if (now >= loopEnd) {
            this.musicalStartTime = loopStart;
            this.audioStartTime = audioNow;
            this.lastScheduledTime = loopStart;
            this.playHead.setCurrentTime(loopStart);
        }

        this.scheduleWindow(now, audioNow);

        requestAnimationFrame(() => this.tick());
    }

    //
    // Incremental scheduling
    //
    private scheduleWindow(now: number, audioNow: number): void {
        const windowEnd = now + this.LOOKAHEAD;

        let i = this.findEventIndex(now);

        while (i < this.notes.length) {
            const ev = this.notes[i];
            const t = ev.timeSeconds;

            const dt = t - now; // event time relative to transport

            if (dt > this.LOOKAHEAD) break;   // outside window
            if (dt < 0) { i++; continue; }    // already passed

            if (isPlaybackNote(ev) && hasPitch(ev)) {
                const midi = xmlPitchToMidi(ev.note.pitch);
                const inst = this.session.getInstrumentForPart(ev.id);
                const ch = this.session.getChannel(ev.id);

                if (inst) {
                    let start = audioNow + dt;

                    if (start < audioNow + this.MIN_OFFSET) {
                        start = audioNow + this.MIN_OFFSET;
                    }

                    inst.play(midi, start, {
                        duration: ev.durationSeconds,
                        gain: 0.8
                    });
                }
            }

            i++;
        }

    }

    //
    // Binary search
    //
    private findEventIndex(time: number): number {
        let low = 0;
        let high = this.notes.length - 1;

        while (low <= high) {
            const mid = (low + high) >>> 1;
            const t = this.notes[mid].timeSeconds;

            if (t < time) low = mid + 1;
            else high = mid - 1;
        }

        return low;
    }
}

