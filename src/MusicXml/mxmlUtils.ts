import {type XmlKey, type XmlLyric, type XmlPart, XmlScore} from "./mxmlTypes";

export function xmlPitchToMidi(step: string | null, octave: number | null, alter: number = 0): number {
    if (!step || octave === null) return 0;

    const stepToSemitone: Record<string, number> = {
        C: 0,
        D: 2,
        E: 4,
        F: 5,
        G: 7,
        A: 9,
        B: 11
    };

    const base = (octave + 1) * 12;
    return base + stepToSemitone[step] + alter;
}

export function xmlDurationToSeconds(duration: number, divisions: number, tempo: number): number {
    const quarterSeconds = 60 / tempo;
    return (duration / divisions) * quarterSeconds;
}

export function getStartingKey(score: XmlScore): XmlKey | null {
    if (score.parts.length === 0) {
        return null;
    }

    const firstPart = score.parts[0];

    for (const measure of firstPart.measures) {
        if (measure.key) {
            return measure.key;
        }
    }

    return null;
}


export function getPartById(score: XmlScore, id: string): XmlPart | null {
    for (const part of score.parts) {
        if (part.id === id) {
            return part;
        }
    }
    return null;
}

export function lyricsToString(lyrics: XmlLyric[]): string {
    if (!lyrics || lyrics.length === 0) return "";

    // Sort by verse number if present
    const sorted = [...lyrics].sort((a, b) => {
        const na = a.number ? parseInt(a.number, 10) : 0;
        const nb = b.number ? parseInt(b.number, 10) : 0;
        return na - nb;
    });

    // Build each verse separately
    const verseStrings = sorted.map(l => {
        const text = l.text?.trim() || "";
        const syll = l.syllabic;

        if (!text) return "";

        switch (syll) {
            case "begin":
                return text + "-";
            case "middle":
                return text + "-";
            case "end":
                return text;
            case "single":
            default:
                return text;
        }
    });

    // Join syllables into a single string
    return verseStrings.join("");
}