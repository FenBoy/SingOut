const sharpKeys = ["C", "G", "D", "A", "E", "B", "F#", "C#"];
const flatKeys  = ["C", "F", "Bb", "Eb", "Ab", "Db", "Gb", "Cb"];

export function tonicNameFromFifths(fifths: number): string {
    return fifths >= 0
        ? sharpKeys[fifths]
        : flatKeys[-fifths];
}

export function pitchClassFromName(name: string): number {
    const map: Record<string, number> = {
        C: 0, "C#": 1, Db: 1,
        D: 2, "D#": 3, Eb: 3,
        E: 4, F: 5, "F#": 6, Gb: 6,
        G: 7, "G#": 8, Ab: 8,
        A: 9, "A#": 10, Bb: 10,
        B: 11
    };
    return map[name];
}

export function pitchClassFromFifths(fifths: number): number {
    const sharpKeys = ["C", "G", "D", "A", "E", "B", "F#", "C#"];
    const flatKeys  = ["C", "F", "Bb", "Eb", "Ab", "Db", "Gb", "Cb"];

    const name = fifths >= 0
        ? sharpKeys[fifths]
        : flatKeys[-fifths];

    const map: Record<string, number> = {
        C: 0, "C#": 1, Db: 1,
        D: 2, "D#": 3, Eb: 3,
        E: 4, F: 5, "F#": 6, Gb: 6,
        G: 7, "G#": 8, Ab: 8,
        A: 9, "A#": 10, Bb: 10,
        B: 11
    };

    return map[name];
}

export function buildScale(tonicPc: number, mode: string): number[] {
    const major = [0, 2, 4, 5, 7, 9, 11];
    const minor = [0, 2, 3, 5, 7, 8, 10];

    const intervals = mode.toLowerCase() === "minor" ? minor : major;
    return intervals.map(i => (tonicPc + i) % 12);
}