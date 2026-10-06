import {type NormalizedTime, normalizeTime, type XmlAttributes} from "./helpers";
import {PPQ} from "./playback";

export class TimeAttributes {
    divisions: number;
    time: NormalizedTime[];

    constructor() {
        this.divisions= 1;
        this.time = [
            {
                beats: 4,
                beatType: 4
            }
        ];
    }

    updateFromAttributes(attrs: XmlAttributes| undefined): void {
        if (!attrs) return;

        // Update divisions only when explicitly present
        if (attrs.divisions !== undefined) {
            this.divisions = attrs.divisions;
        }

        // Update time only when explicitly present
        if (attrs.time !== undefined) {
            const normalized = normalizeTime(attrs.time);

            if (normalized.length > 0) {
                this.time = normalized;
            }
        }
    }

    getMeasureLengthQN(): number
    {
        const time = this.time[0];
        return time.beats * (4 / time.beatType);
    }
}

export function computeSecondsPerTick(bpm: number): number {
    return 60 / (bpm * PPQ);
}
