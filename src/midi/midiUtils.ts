export function freqToMidiFloat(freq: number): number {
    return 69 + 12 * Math.log2(freq / 440);
}

export function freqToMidi(freq: number): number {
    return Math.round(freqToMidiFloat(freq));
}

export function freqToCents(freq: number): number {
    const midiFloat = freqToMidiFloat(freq);
    const midiInt = Math.round(midiFloat);
    return (midiFloat - midiInt) * 100;
}

export function midiToFreq(midi: number): number {
    return 440 * Math.pow(2, (midi - 69) / 12);
}


// src/midi/midiUtils.ts
// import {type XmlLyric, type XmlMeasure, type XmlPart, XmlScore} from "../MusicXml/mxmlTypes";
// import {
//     MidiScore,
//     type TempoChange,
//     type DivisionChange,
//     type MidiNote,
//     type MidiMeasure,
//     MidiPartInfo
// } from "./midiTypes";
// import {getStartingKey} from "../MusicXml/mxmlUtils";
// import {type ScheduledNote, scheduleNotes} from "./midiSchedule";

// export const majorKeys = [
//     "Cb", "Gb", "Db", "Ab", "Eb", "Bb", "F",
//     "C",
//     "G", "D", "A", "E", "B", "F#", "C#"
// ] as const;
//
// export const minorKeys = [
//     "Abm", "Ebm", "Bbm", "Fm", "Cm", "Gm", "Dm",
//     "Am",
//     "Em", "Bm", "F#m", "C#m", "G#m", "D#m", "A#m"
// ] as const;
//
// export type MajorKey = typeof majorKeys[number];
// export type MinorKey = typeof minorKeys[number];
//
// const keyToPc = {
//     C: 0,  "C#": 1, "Db": 1,
//     D: 2,  "D#": 3, "Eb": 3,
//     E: 4,
//     F: 5,  "F#": 6, "Gb": 6,
//     G: 7,  "G#": 8, "Ab": 8,
//     A: 9,  "A#": 10, "Bb": 10,
//     B: 11
// } as const;
//
// export function tonicFromKey(sf: number, minorFlag: boolean): number {
//     const majorTonics = [
//         11, 6, 1, 8, 3, 10, 5,
//         0,
//         7, 2, 9, 4, 11, 6, 1
//     ] as const;
//
//     const minorTonics = [
//         8, 3, 10, 5, 0, 7, 2,
//         9,
//         4, 11, 6, 1, 8, 3, 10
//     ] as const;
//
//     return minorFlag
//         ? minorTonics[sf + 7]
//         : majorTonics[sf + 7];
// }
//
// export function keySignatureName(sf:number, minorFlag:boolean):string {
//
//     return !minorFlag
//         ? majorKeys[sf + 7]
//         : minorKeys[sf + 7];
// }
//
// /** Convert MusicXML (fifths + mode) into a typed KeyName */
// // export function keyNameFromFifths(
// //     sf: number,
// //     isMinor: boolean
// // ): KeyName {
// //     const index = sf + 7;
// //
// //     const name = isMinor
// //         ? minorKeys[index]
// //         : majorKeys[index];
// //
// //     // Strip the trailing "m" for minor keys → convert "Ebm" → "Eb"
// //     return (isMinor
// //         ? name.replace("m", "")
// //         : name) as KeyName;
// // }
//
// export function keyNameFromFifths(fifths: number, mode: string): string {
//     // Standard circle-of-fifths mapping
//     const sharpKeys = ["C", "G", "D", "A", "E", "B", "F#", "C#"];
//     const flatKeys  = ["C", "F", "Bb", "Eb", "Ab", "Db", "Gb", "Cb"];
//
//     const name = fifths >= 0
//         ? sharpKeys[fifths] ?? "C"
//         : flatKeys[-fifths] ?? "C";
//
//     // Normalize mode text
//     const modeName = mode.toLowerCase() === "minor" ? "minor" : "major";
//
//     return `${name} ${modeName}`;
// }
//
//
// // export function getInitialKey(score: ScoreModel): string {
// //     if (score.keyChanges.length === 0) {
// //         return "C major";
// //     }
// //
// //     const first = score.keyChanges[0];
// //     return keyNameFromFifths(first.fifths, first.mode);
// // }
//
// export type PitchClass = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;
//
// export function transposeTonic(tonic: PitchClass, semitones: number): PitchClass {
//     return ((tonic + semitones + 12) % 12) as PitchClass;
// }
//
// // export function buildScale(key: KeyName, isMinor: boolean): number[] {
// //     const tonic = getTonicPC(key);
// //
// //     const majorPattern = [0, 2, 4, 5, 7, 9, 11] as const;
// //     const minorPattern = [0, 2, 3, 5, 7, 8, 10] as const;
// //
// //     const pattern = isMinor ? minorPattern : majorPattern;
// //
// //     return pattern.map(pc => (pc + tonic) % 12);
// // }
//
// export function mapToDiatonicLane(
//     midiNote: number,
//     scalePcs: number[]
// ): { lane: number; offset: number } {
//
//     const pc = midiNote % 12;
//
//     let bestLane = 0;
//     let bestDist = 12;
//
//     for (let i = 0; i < scalePcs.length; i++) {
//         const dist = Math.abs(pc - scalePcs[i]);
//         if (dist < bestDist) {
//             bestDist = dist;
//             bestLane = i;
//         }
//     }
//
//     const offset = pc - scalePcs[bestLane];
//
//     return { lane: bestLane, offset };
// }
//
// export function nearestScaleDegree(
//     pc: number,
//     scaleDegrees: readonly number[] = [0, 2, 4, 5, 7, 9, 11]
// ): { sd: number; offset: number } {
//
//     let best = scaleDegrees[0];
//     let bestDist = 12;
//
//     for (const sd of scaleDegrees) {
//         const dist = Math.abs(pc - sd);
//         if (dist < bestDist) {
//             bestDist = dist;
//             best = sd;
//         }
//     }
//
//     return { sd: best, offset: pc - best };
// }
//
// export function buildScaleMidi(
//     tonicMidi: number,
//     isMinor: boolean
// ): number[] {
//
//     const majorPattern = [0, 2, 4, 5, 7, 9, 11] as const;
//     const minorPattern = [0, 2, 3, 5, 7, 8, 10] as const;
//
//     const pattern = isMinor ? minorPattern : majorPattern;
//
//     return pattern.map(semi => tonicMidi + semi);
// }
//
// export function nearestDiatonic(
//     midiNote: number,
//     scaleMidi: readonly number[]
// ): number {
//
//     let best: number | null = null;
//     let bestDist = Infinity;
//
//     for (let octave = -3; octave <= 3; octave++) {
//         for (const base of scaleMidi) {
//             const candidate = base + octave * 12;
//             const dist = Math.abs(candidate - midiNote);
//
//             if (dist < bestDist) {
//                 bestDist = dist;
//                 best = candidate;
//             }
//         }
//     }
//
//     return best!;
// }
//
// export function mapToLane(
//     tonicMidi: number,
//     isMinor: boolean,
//     midiNote: number
// ): { lane: number; octave: number; offset: number } {
//
//     const scaleMidi = buildScaleMidi(tonicMidi, isMinor);
//     const nearest = nearestDiatonic(midiNote, scaleMidi);
//
//     const offset = midiNote - nearest; // chromatic offset
//
//     const basePc = nearest % 12;
//     const tonicPc = tonicMidi % 12;
//
//     const majorPattern = [0, 2, 4, 5, 7, 9, 11] as const;
//     const minorPattern = [0, 2, 3, 5, 7, 8, 10] as const;
//
//     const pattern = isMinor ? minorPattern : majorPattern;
//
//     const scalePcs = pattern.map(semi => (tonicPc + semi) % 12);
//     const lane = scalePcs.indexOf(basePc);
//
//     const octave = Math.floor((nearest - tonicMidi) / 12);
//
//     return { lane, octave, offset };
// }
//
// export function rowToMidi(
//     rowIndex: number,
//     tonicMidi: number,
//     isMinor: boolean
// ): number {
//
//     const majorSteps = [0, 2, 4, 5, 7, 9, 11] as const;
//     const minorSteps = [0, 2, 3, 5, 7, 8, 10] as const;
//
//     const steps = isMinor ? minorSteps : majorSteps;
//
//     const lane = rowIndex % 7;
//     const octave = Math.floor(rowIndex / 7);
//
//     return tonicMidi + steps[lane] + octave * 12;
// }
//
// export function freqToMidiFloat(freq: number): number {
//     return 69 + 12 * Math.log2(freq / 440);
// }
// export function freqToMidi(freq: number): number {
//     return Math.round(freqToMidiFloat(freq));
// }
//
// export function freqToCents(freq: number): number {
//     const midiFloat = freqToMidiFloat(freq);
//     const midiInt = Math.round(midiFloat);
//     return (midiFloat - midiInt) * 100;
// }
//
// export function midiToFreq(midi: number): number {
//     return 440 * Math.pow(2, (midi - 69) / 12);
// }
//
//
//
//
// // function convertQNToSeconds(qn: number, tempoMap: TempoChange[]): number {
// //     if (tempoMap.length === 0) return 0;
// //
// //     // Find the last tempo segment where segment.globalQN <= qn
// //     let segment = tempoMap[0];
// //     for (let i = 1; i < tempoMap.length; i++) {
// //         if (tempoMap[i].globalQN <= qn) {
// //             segment = tempoMap[i];
// //         } else {
// //             break;
// //         }
// //     }
// //
// //     const deltaQN = qn - segment.globalQN;
// //     const seconds = segment.secondsAtChange + deltaQN * (60 / segment.bpm);
// //
// //     return seconds;
// // }
// //
// // export function getScheduledNotes(score: MidiScore | null): ScheduledNote[] {
// //     if (!score) return [];
// //
// //     return scheduleNotes(
// //         score.notes,
// //         score.tempoMap,
// //         score.partDivisions
// //     );
// // }
// //
// //
// // export function getStartingTempo(score: MidiScore | null): number {
// //     if(!score) return 120;
// //     if (score.tempoMap.length === 0) return 120; // fallback
// //     return score.tempoMap[0].bpm;
// // }
// //
// // export function filterNotesByPart(notes: ScheduledNote[], partId: string): ScheduledNote[] {
// //     return notes.filter(n => n.partId === partId);
// // }
