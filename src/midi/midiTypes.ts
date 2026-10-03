// import type {XmlKey, XmlLyric} from "../MusicXml/mxmlTypes";
//
// export interface TempoChange {
//     globalQN: number;       // musical time (quarter-note units)
//     bpm: number;            // tempo at this point
//     secondsAtChange: number; // absolute time at this point
// }
//
// export interface DivisionChange {
//     localDivisions:number;
//     globalQNPosition:number;
//     measureIndex:number; // maybe for debugging
// }
//
// export interface MidiNote {
//     pitch: number | null;
//     startDiv:number;
//     durationDiv:number;
//     measureIndex: number;
//     voice: number;
//     absoluteQN: number;
//
//     // added by me
//     velocity:number;
//     lyrics: XmlLyric[];
//     scoreMeasureNumber: string;  // original MusicXML measure number
//     partId: string;
//
//     // suggested by AI
//     // tie?: "start" | "stop";
//     // slur?: "start" | "stop";
//     // unpitched?: boolean;
//     // rest?: boolean;
//
//     // feedback data, maybe in another structure
//     hit:boolean;
//     bestCents:number;
// }
//
// export interface MidiMeasure {
//     playbackIndex: number;       // 0-based index in expanded score
//     scoreNumber: string;         // MusicXML <measure number="X">
//     startQN: number;
//     durationQN: number;
//     divisions: number;
// }
//
// // lets store the parts after we have parsed them
// export class MidiPart{
//     notes: MidiNote[] = [];
// }
//
// export class MidiPartInfo {
//     constructor(
//         public index: string,
//         public name: string | null,
//         public muted: boolean = false,
//         public volume: number = 1.0
//         // maybe pan would be nice?
//     ) {}
// }
//
// export class MidiScore {
//     title:string = "";
//     tempoMap: TempoChange[] = [];
//     partInfo: MidiPartInfo[] = [];
//     part: MidiPart[] = [];
//     partDivisions: Map<string, DivisionChange[]> = new Map();
//     notes: MidiNote[] = [];
//     measures: MidiMeasure[] = [];
//     startingKey: XmlKey | null = null;
// }
