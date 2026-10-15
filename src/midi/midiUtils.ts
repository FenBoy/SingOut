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
