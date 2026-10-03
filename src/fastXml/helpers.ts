
// helpers.ts

//
// ─── TOP LEVEL TYPES ───────────────────────────────────────────────
//

export interface XmlWork {
    "work-title"?: string;
}

// more likely place for title from MuseScore 4
export interface XmlCredit {
    "credit-type"?: string;
    "credit-words"?: {
        "#text"?: string;
    } | string;
}

export interface XmlScoreInstrument {
    "@_id": string;
    "instrument-name"?: string;
}

export interface XmlMidiInstrument {
    "@_id": string;
    "instrument-sound"?: string;
    "midi-channel"?: number;
    "midi-program"?: number;
    "volume"?: number;
    "pan"?: number;
}

// <score-part>
export interface XmlScorePart {
    "@_id": string;
    "part-name"?: string;
    "part-abbreviation"?: string;

    // These can be single or arrays depending on the XML
    "score-instrument"?: XmlScoreInstrument | XmlScoreInstrument[];
    "midi-instrument"?: XmlMidiInstrument | XmlMidiInstrument[];
    [key: string]: unknown;
}

// <part-list>
export interface XmlPartList {
    "score-part": XmlScorePart | XmlScorePart[];
}

// <measure>
export interface XmlMeasure {
    "@_number": string;

    note?: XmlNote | XmlNote[];
    backup?: XmlBackup | XmlBackup[];
    forward?: XmlForward | XmlForward[];
    direction?: XmlDirection | XmlDirection[];
    barline?: XmlBarline | XmlBarline[];
    attributes?: XmlAttributes;

    [key: string]: unknown;
}


// <part>
export interface XmlPart {
    "@_id": string;
    measure: XmlMeasure | XmlMeasure[];
    [key: string]: unknown;
}

// <score-partwise>
export interface XmlScorePartwise {
    work?: XmlWork;
    "part-list"?: XmlPartList;
    part?: XmlPart | XmlPart[];
    "movement-title"?: string;
    credit?: XmlCredit | XmlCredit[];
}

export interface XmlPitch {
    step?: string;
    octave?: string;
    alter?: number;
}

export interface XmlNote {
    pitch?: XmlPitch;
    duration?: number;      // this is in quarter notes still
    voice?: number | string;
    type?: string;
    lyric: XmlLyric | XmlLyric[];
    [key: string]: unknown;
}

export interface XmlLyric {
    "@_number"?: string;
    syllabic?: string;
    text?: string;
}

export interface XmlTempoEvent {
    bpm: number;
}

export type XmlMeasureEvent =
    | { type: "note"; note: XmlNote }
    | { type: "backup"; backup: XmlBackup }
    | { type: "forward"; forward: XmlForward }
    | { type: "direction"; direction: XmlDirection }
    | { type: "barline"; barline: XmlBarline }
    | { type: "tempo"; tempo: XmlTempoEvent };

export interface XmlBackup {
    duration?: number;
    [key: string]: unknown;
}

export interface XmlForward {
    duration?: number;
    [key: string]: unknown;
}


export interface XmlSound {
    "@_tempo"?: number | string;
}

export interface XmlDirection {
    sound?: XmlSound;
}

export interface XmlBarline {
    [key: string]: unknown;
}

export interface XmlKey {
    fifths: number | string;
    mode?: string;
}

export interface XmlTime {
    beats?: number | string | (number | string)[];
    "beat-type"?: number | string | (number | string)[]; // has to be quotes as we want have hyphens in names
}

export interface XmlAttributes {
    divisions?: number;
    key?: XmlKey | XmlKey[];
    time?: XmlTime | XmlTime[];
    clef?: unknown;
    [key: string]: unknown;
}

// Normalizers
export function normalizeTime(raw: XmlTime | XmlTime[] | undefined): XmlTime[] {
    if (!raw) return [];
    return Array.isArray(raw) ? raw : [raw];
}
export function normalizeKey(raw: XmlKey | XmlKey[] | undefined): XmlKey[] {
    if (!raw) return [];
    return Array.isArray(raw) ? raw : [raw];
}

function normalizeScoreParts(score: XmlScorePartwise): XmlPart[] {
    const raw = score.part;
    if (!raw) return [];
    return Array.isArray(raw) ? raw : [raw];
}

export function normalizeScoreInstruments(
    raw: XmlScoreInstrument | XmlScoreInstrument[] | undefined
): XmlScoreInstrument[] {
    if (!raw) return [];

    return Array.isArray(raw) ? raw : [raw];
}

export function getPrimaryScoreInstrument(
    part: XmlScorePart
): XmlScoreInstrument | undefined {
    const list = normalizeScoreInstruments(part["score-instrument"]);
    return list[0];
}

export function normalizeMidiInstruments(
    raw: XmlMidiInstrument | XmlMidiInstrument[] | undefined
): XmlMidiInstrument[] {
    if (!raw) return [];

    return Array.isArray(raw) ? raw : [raw];
}

export function getPrimaryMidiInstrument(
    part: XmlScorePart
): XmlMidiInstrument | undefined {
    const list = normalizeMidiInstruments(part["midi-instrument"]);
    return list[0];
}

export function normalizePartList(list: XmlPartList): XmlScorePart[] {
    const sp = list["score-part"];
    return Array.isArray(sp) ? sp : [sp];
}

export function normalizeScorePartList(score: XmlScorePartwise): XmlScorePart[] {
    const partList = score["part-list"];
    if (!partList) return [];
    return normalizePartList(partList);
}

export function normalizeMeasures(raw: XmlMeasure | XmlMeasure[] | undefined): XmlMeasure[] {
    if (!raw) return [];
    return Array.isArray(raw) ? raw : [raw];
}

//
// ─── HELPERS ───────────────────────────────────────────────────────
//

// Returns empty string if not defined

export function getTitle(score: XmlScorePartwise): string {
    // 1. Preferred: work-title
    const workTitle = score.work?.["work-title"];
    if (typeof workTitle === "string" && workTitle.trim() !== "") {
        return workTitle;
    }

    // 2. Next: movement-title
    const movementTitle = score["movement-title"];
    if (typeof movementTitle === "string" && movementTitle.trim() !== "") {
        return movementTitle;
    }

    // 3. MuseScore fallback: credit block
    if (score.credit) {
        const credits = Array.isArray(score.credit)
            ? score.credit
            : [score.credit];

        for (const c of credits) {
            if (c["credit-type"] === "title") {
                const words = c["credit-words"];

                if (typeof words === "string" && words.trim() !== "") {
                    return words;
                }

                if (typeof words === "object" && typeof words["#text"] === "string") {
                    const text = words["#text"].trim();
                    if (text !== "") {
                        return text;
                    }
                }
            }
        }
    }

    // 4. Default: empty string
    return "";
}

// Always returns an array, even if only one <score-part> exists
export function getPartList(scoreObj: XmlScorePartwise): XmlScorePart[] {
    const partList = scoreObj["part-list"];
    if (!partList) return [];

    const parts = partList["score-part"];
    if (!parts) return [];

    return Array.isArray(parts) ? parts : [parts];
}

// Extract <part> elements (the ones containing measures)
export function getParts(scoreObj: XmlScorePartwise): XmlPart[] {
    const parts = scoreObj.part;
    if (!parts) return [];
    return Array.isArray(parts) ? parts : [parts];
}

// Extract <measure> elements from a <part>
export function getMeasures(partObj: XmlPart): XmlMeasure[] {
    const measures = partObj.measure;
    if (!measures) return [];

    return Array.isArray(measures) ? measures : [measures];
}


export function getPartName(part: XmlScorePart): string {
    const raw = part["part-name"];

    if (typeof raw === "string") return raw;

    if (raw && typeof raw === "object" && "#text" in raw) {
        return String(raw["#text"]);
    }

    return part["@_id"]; // fallback
}

export function getNotes(measureObj: XmlMeasure): XmlNote[] {
    return getMeasureEvents(measureObj)
        .filter(ev => ev.type === "note")
        .map(ev => ev.note);
}

export function getLyrics(noteObj: XmlNote): XmlLyric[] {
    const lyrics = noteObj.lyric;
    if (!lyrics) return [];
    return Array.isArray(lyrics) ? lyrics : [lyrics];
}

export function getLyricText(note: XmlNote): string {
    const lyrics = getLyrics(note);
    if (lyrics.length === 0) return "";
    return lyrics[0].text ?? "";
}

export function getMeasureEvents(measureObj: XmlMeasure): XmlMeasureEvent[] {
    const events: XmlMeasureEvent[] = [];

    // 1. direction (tempo) FIRST
    if (measureObj.direction) {
        const dirs = Array.isArray(measureObj.direction)
            ? measureObj.direction
            : [measureObj.direction];

        for (const d of dirs) {
            if (d.sound && d.sound["@_tempo"] !== undefined) {
                events.push({
                    type: "tempo",
                    tempo: { bpm: Number(d.sound["@_tempo"]) }
                });
            } else {
                events.push({ type: "direction", direction: d });
            }
        }
    }

    // 2. notes
    if (measureObj.note) {
        const notes = Array.isArray(measureObj.note)
            ? measureObj.note
            : [measureObj.note];
        for (const n of notes) events.push({ type: "note", note: n });
    }

    // 3. backup
    if (measureObj.backup) {
        const backups = Array.isArray(measureObj.backup)
            ? measureObj.backup
            : [measureObj.backup];
        for (const b of backups) events.push({ type: "backup", backup: b });
    }

    // 4. forward
    if (measureObj.forward) {
        const forwards = Array.isArray(measureObj.forward)
            ? measureObj.forward
            : [measureObj.forward];
        for (const f of forwards) events.push({ type: "forward", forward: f });
    }

    // 5. barline
    if (measureObj.barline) {
        const bars = Array.isArray(measureObj.barline)
            ? measureObj.barline
            : [measureObj.barline];
        for (const b of bars) events.push({ type: "barline", barline: b });
    }

    return events;
}


export function getDivisions(measure: XmlMeasure): number {
    const attrs = measure.attributes;
    if (!attrs) return 1;

    return attrs.divisions ?? 1;
}

export function getPartIndexFromScore(
    score: XmlScorePartwise,
    selected: XmlScorePart
): number {

    console.log("selected raw:", selected["@_id"], typeof selected["@_id"]);
    console.log("partList raw:", getPartList(score).map(p => [p["@_id"], typeof p["@_id"]]));

    const partList = normalizeScoreParts(score);
    return partList.findIndex(p => p["@_id"] === selected["@_id"]);
}

export function getStartingKey(score: XmlScorePartwise | null): XmlKey | null {
    if(score == null) return { fifths: 0, mode: "major"};
    const parts = normalizeScoreParts(score);
    if (parts.length === 0) return null;

    const firstPart = parts[0];

    const measures = normalizeMeasures(firstPart.measure);
    if (measures.length === 0) return null;

    const firstMeasure = measures[0];
    const attrs = firstMeasure.attributes;
    if (!attrs || !attrs.key) return null;

    const keys = normalizeKey(attrs.key);
    if (keys.length === 0) return null;

    const key = keys[0];

    return {
        fifths: Number(key.fifths),
        mode: key.mode ?? "major"
    };
}

export function xmlPitchToMidi(p: XmlPitch | null | undefined): number {
    if(!p) return 0;
    if (!p.step || !p.octave) return 0;

    const stepToSemitone: Record<string, number> = {
        C: 0,
        D: 2,
        E: 4,
        F: 5,
        G: 7,
        A: 9,
        B: 11
    };

    const semitone = stepToSemitone[p.step];
    if (semitone === undefined) return 0;

    const octave = Number(p.octave);
    if (Number.isNaN(octave)) return 0;

    const alter = typeof p.alter === "number" ? p.alter : 0;

    return (octave + 1) * 12 + semitone + alter;
}
