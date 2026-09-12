
export interface MidiLyric {
    text: string;
    time: number;
}

export interface Note {
    midi: number;
    start: number;          // unified start time (seconds)
    duration: number;       // unified duration (seconds)
    velocity: number;
    partIndex: number;      // 0 for MIDI, actual part for MusicXML
    lyric: string | null;
}

/* -----------------------------
   MUSICXML TYPES
   ----------------------------- */

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


/* -----------------------------
   SCORE MODEL
   ----------------------------- */

export interface ScoreModel {
    measures: MeasureModel[];
    keyChanges: KeyChange[];
    tempoChanges: TempoChange[];
    timeSignatures: TimeSignature[];
    notes: XmlNote[];
    lyrics: XmlLyric[];
}

