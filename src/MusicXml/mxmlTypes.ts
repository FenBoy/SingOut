export interface XmlScorePart {
    id: string;
    partName: string | null;
    partAbbreviation: string | null;
    instrumentName: string | null;
    instrumentSound: string | null;

    midi: {
        channel: number | null;
        program: number | null;
        volume: number | null;
        pan: number | null;
    } | null;
}

// note: continuation notes can be skipped (no duration)
// Skip tied continuation notes
// if (ties.some(t => t.type === "stop")) {
    // tied continuation notes have no duration and should not be played
    // your measure parser can decide to ignore them
// }

export interface XmlTie {
    type: "start" | "stop";
}

export interface XmlSlur {
    type: "start" | "stop";
    number: string | null;
}

export interface XmlFermata {
    type: string | null;   // "upright", "inverted", or null
}

export interface XmlDynamicMark {
    type: "mark";          // p, mf, ff, etc.
    value: string;         // "p", "mf", "ff"
}

export interface XmlHairpin {
    type: "hairpin";       // crescendo or diminuendo
    direction: "crescendo" | "diminuendo";
}

export interface XmlNumericDynamic {
    type: "numeric";       // explicit numeric dynamic
    value: number;         // 0–127
}

export type XmlDynamic = XmlDynamicMark | XmlHairpin | XmlNumericDynamic;

export interface XmlDivisions {
    value: number;
}

export interface XmlLyric {
    number: string | null;
    syllabic: string | null;
    text: string | null;
}

export interface XmlKey {
    fifths: number | null;
    mode: string | null;
}

export interface XmlBarline {
    location: string | null;
    style: string | null;
    repeat: string | null;   // "forward" | "backward" | null
}

export interface XmlNote {
    step: string | null;
    octave: number | null;
    durationDiv: number | null;
    voice: number | null;
    lyrics?: XmlLyric[];
    slurs: XmlSlur[];
    ties: XmlTie[];
    unpitched: boolean; // to filter out percussion instruments
    rest: boolean;
    dynamic: number;   // from note @dynamics
}

export type XmlMeasureEvent =
    | { type: "note", note: XmlNote }
    | { type: "backup", durationDiv: number }
    | { type: "forward", durationDiv: number }
    | { type: "tempo", bpm: number };

export interface XmlJump {
    segno?: boolean;      // <segno/>
    coda?: boolean;       // <coda/>
    dsAlCoda?: boolean;   // "D.S. al Coda"
    toCoda?: boolean;     // "To Coda"

    dcAlFine?: boolean;   // “D.C. al Fine”
    fine?: boolean;       // “Fine”

    dsAlFine?: boolean;
    dcAlCoda?: boolean;
}

export interface XmlMeasure{
    number: string;
    events: XmlMeasureEvent[];
    key: XmlKey | null;
    divisions: XmlDivisions | null;
    barLines: XmlBarline[];
    dynamics: XmlDynamic[];
    fermatas: XmlFermata[];

    repeat?: { direction: "forward" | "backward" } | null;
    ending?: { number: string; type: "start" | "stop" } | null;

    jump?: XmlJump | null;
}

export interface XmlPart {
    id: string;
    measures: XmlMeasure[];
}

export class XmlScore
{
    workTitle?: string | null;

    // describes what the parts are
    scoreParts: XmlScorePart[] = [];

    // the parts themselves
    parts: XmlPart[] = [];
}
