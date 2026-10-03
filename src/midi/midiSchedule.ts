// import type {DivisionChange, MidiMeasure, MidiNote, TempoChange} from "./midiTypes";
// import {type XmlLyric, XmlScore} from "../MusicXml/mxmlTypes";
//
// export interface ScheduledNote {
//     pitch: number | null;
//     velocity: number;
//     startSeconds: number;
//     durationSeconds: number;
//     measureIndex: number;
//     partId: string;
//     voice: number;
//     lyrics: XmlLyric[];
//     hit:boolean;
//     bestCents:number;
// }
//
// function bpmAt(globalQN: number, tempoMap: TempoChange[]): number {
//     let last = tempoMap[0];
//
//     for (const t of tempoMap) {
//         if (t.globalQN <= globalQN) {
//             last = t;
//         } else {
//             break;
//         }
//     }
//
//     return last.bpm;
// }
//
// export function convertQNToSeconds(globalQN: number, tempoMap: TempoChange[]): number {
//     let last = tempoMap[0];
//
//     for (const t of tempoMap) {
//         if (t.globalQN <= globalQN) {
//             last = t;
//         } else {
//             break;
//         }
//     }
//
//     const deltaQN = globalQN - last.globalQN;
//     const seconds = last.secondsAtChange + deltaQN * (60 / last.bpm);
//
//     return seconds;
// }
//
// export function scheduleNotes(
//     notes: MidiNote[],
//     tempoMap: TempoChange[],
//     partDivisions: Map<string, DivisionChange[]>
// ): ScheduledNote[] {
//
//     const scheduled: ScheduledNote[] = [];
//
//     for (const n of notes) {
//         const divisions = partDivisions.get(n.partId)!;
//         const divInfo = divisions[n.measureIndex];
//
//         const localDivisions = divInfo.localDivisions;
//
//         const startSeconds = convertQNToSeconds(n.absoluteQN, tempoMap);
//         const durationQN = n.durationDiv / localDivisions;
//
//         const bpm = tempoMap.find(t => t.globalQN <= n.absoluteQN)?.bpm ?? tempoMap[0].bpm;
//         const durationSeconds = durationQN * (60 / bpm);
//
//         scheduled.push({
//             pitch: n.pitch,
//             velocity: n.velocity,
//             startSeconds,
//             durationSeconds,
//             measureIndex: n.measureIndex,
//             partId: n.partId,
//             voice: n.voice,
//             lyrics: n.lyrics,
//             hit: false,
//             bestCents: 0
//         });
//     }
//
//     return scheduled;
// }


