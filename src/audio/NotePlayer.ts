import * as Tone from "tone";

let started = false;

const synth = new Tone.Synth({
    oscillator: { type: "sine" },
    envelope: { attack: 0.01, decay: 0.1, sustain: 0.3, release: 0.2 }
}).toDestination();

export async function playMidi(midi: number, durationSeconds = 0.3) {
    if (!started) {
        await Tone.start();
        started = true;
    }
    const freq = Tone.Frequency(midi, "midi").toFrequency();
    synth.triggerAttackRelease(freq, durationSeconds);
}
