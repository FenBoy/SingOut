// import * as Tone from "tone";
// import { type IPlayer, PlaySession } from "./PlaySession";
// import type { PlayHead } from "./PlayHead";
// import type { MidiScore } from "../midi/midiTypes";
// import type {ScheduledNote} from "../midi/midiSchedule";
// import {getScheduledNotes} from "../midi/midiUtils";
//
//
// export class SharedPlayer implements IPlayer {
//     private synth: Tone.PolySynth;
//     session: PlaySession;
//     playHead: PlayHead;
//     private timer: ReturnType<typeof setTimeout> | null = null;
//     private isPlaying: boolean = false;
//     private lastTime: number = 0;
//
//     notes: ScheduledNote[] = [];
//     private noteIndex: number = 0;
//
//     constructor(session: PlaySession, playHead: PlayHead) {
//         this.session = session;
//         this.playHead = playHead;
//
//         this.synth = new Tone.PolySynth({
//             voice: Tone.Synth,
//             options: {
//                 oscillator: { type: "sine" },
//                 envelope: {
//                     attack: 0.01,
//                     decay: 0.1,
//                     sustain: 0.9,
//                     release: 0.3
//                 }
//             }
//         });
//         this.synth.toDestination();
//
//         this.populateNotes();
//         this.session.onChange(() => this.populateNotes());
//     }
//
//     populateNotes() {
//         const backing: MidiScore | null = this.session.getBackingMusicXml();
//         if (backing) {
//             this.notes = getScheduledNotes(backing);
//         }
//     }
//
//     getIsPlaying(): boolean {
//         return this.isPlaying;
//     }
//
//     private recalcNoteIndex(now: number) {
//         let lo = 0;
//         let hi = this.notes.length - 1;
//
//         while (lo <= hi) {
//             const mid = (lo + hi) >> 1;
//             if (this.notes[mid].startSeconds < now) {
//                 lo = mid + 1;
//             } else {
//                 hi = mid - 1;
//             }
//         }
//
//         this.noteIndex = lo;
//     }
//
//     play() {
//         this.clearTimer();
//         this.isPlaying = true;
//
//         const tick = () => {
//             if (!this.isPlaying) return;
//
//             const now = this.playHead.getCurrentTime();
//
//             if (now < this.lastTime) {
//                 this.recalcNoteIndex(now);
//             }
//
//             this.lastTime = now;
//
//             if (now < this.playHead.getLoopStart()) return;
//
//             if (now > this.playHead.getMaxTime() || now > this.playHead.getLoopEnd()) {
//                 this.session.playComplete();
//                 this.isPlaying = false;
//                 this.session.pause();
//                 return;
//             }
//
//             while (
//                 this.noteIndex < this.notes.length &&
//                 this.notes[this.noteIndex].startSeconds <= now
//                 ) {
//                 const n = this.notes[this.noteIndex];
//                 const start = Tone.now() + (n.startSeconds - now);
//
//                 if (n.pitch !== null) {
//                     this.synth.triggerAttackRelease(
//                         Tone.Frequency(n.pitch, "midi").toFrequency(),
//                         n.durationSeconds,
//                         start,
//                         n.velocity
//                     );
//
//                     console.log(
//                         `t: ${this.session.getCurrentTime()} midi ${n.pitch} dur ${n.durationSeconds} voice ${n.voice} vel ${n.velocity}`
//                     );
//                 }
//
//                 this.noteIndex++;
//             }
//
//             this.timer = setTimeout(tick, 10);
//         };
//
//         tick();
//     }
//
//     seek(time: number) {
//         const idx = this.notes.findIndex(n => n.startSeconds >= time);
//         this.noteIndex = idx === -1 ? this.notes.length : idx;
//
//         if (this.isPlaying) {
//             this.play();
//         }
//     }
//
//     clearTimer() {
//         if (this.timer !== null) {
//             clearTimeout(this.timer);
//             this.timer = null;
//         }
//     }
//
//     pause() {
//         this.isPlaying = false;
//         this.clearTimer();
//     }
// }
