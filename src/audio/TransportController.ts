import * as Tone from "tone";

export class TransportController {
    start(): void {
        Tone.Transport.start();
    }

    pause(): void {
        Tone.Transport.pause();
    }

    stop(): void {
        Tone.Transport.stop();
        Tone.Transport.seconds = 0;
    }

    seek(seconds: number): void {
        Tone.Transport.seconds = seconds;
    }

    schedule(callback: (time: number) => void, atSeconds: number): void {
        Tone.Transport.schedule(callback, atSeconds);
    }

    setTempo(bpm: number, atSeconds: number): void {
        Tone.Transport.schedule(time => {
            Tone.Transport.bpm.rampTo(bpm, 0.01, time);
        }, atSeconds);
    }

    get isPlaying(): boolean {
        return Tone.Transport.state === "started";
    }
}


