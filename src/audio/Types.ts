
// export interface MidiLyric {
//     text: string;
//     time: number;
// }

// for playing midi and storing results
import type {XmlLyric, XmlSlur, XmlTie} from "../MusicXml/mxmlTypes";

// export interface Note {
//     midi: number;
//     start: number;          // unified start time (seconds)
//     duration: number;       // unified duration (seconds)
//     velocity: number;
//     partIndex: string | null;
//     lyric: string | null;
//     measureIndex: number;
//     hit?: boolean;
//     bestCents?: number;
// }

// for enabling/disabling parts


/* -----------------------------
   MUSICXML TYPES
   ----------------------------- */

// replaced by XmlScore

/*
export interface MeasureModel {
    index: number;
    startTime: number;
    duration: number;
    divisions: number;
    partIndex: number;        // NEW
}

export interface KeyChange {
    measureIndex: number;   // where the key changes
    fifths: number;         // MusicXML <key><fifths> (e.g., 0=C, 1=G, -3=Eb)
    mode: string;           // "major", "minor", "dorian", etc.
}

export interface TempoChange {
    timeSeconds: number;    // absolute time in seconds
    bpm: number;            // beats per minute
}

export interface TimeSignature {
    measureIndex: number;
    beats: number;          // numerator
    beatType: number;       // denominator
}

export interface XmlNote {
    pitch: number;
    startTime: number;
    duration: number;
    voice: number;
    measureIndex: number;
    partIndex: number;        // NEW
    lyric?: string;

    startDivisions: number;
    durationDivisions: number;
}

export interface XmlLyric {
    text: string;
    noteIndex: number;
    measureIndex: number;
    partIndex: number;        // NEW
}

export interface RepeatInfo {
    measureIndex: number;
    repeatStart: boolean;
    repeatEnd: boolean;
    endingNumber: number | null;
}

export class PartInfo {
    constructor(
        public index: number,
        public name: string,
        public muted: boolean = false,
        public volume: number = 1.0
    ) {}
}
*/

/* -----------------------------
   SCORE MODEL
   ----------------------------- */
// replaced by XmlScore

// export interface ScoreModel {
//     measures: MeasureModel[];
//     keyChanges: KeyChange[];
//     tempoChanges: TempoChange[];
//     timeSignatures: TimeSignature[];
//     notes: XmlNote[];
//     lyrics: XmlLyric[];
//     parts: PartInfo[];
//     repeatInfo: RepeatInfo[];
//     playOrder:number[]
// }

