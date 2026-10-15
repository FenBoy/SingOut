import {getDirectionBpm, normalizeKey} from "../helpers";
import type {TimelineMeasure} from "../timeline";
import type {PlaybackEvent} from "../playback";
import {TimeAttributes} from "../timeAttributes";

class PlaybackState {
    bpm: number;
    ta: TimeAttributes = new TimeAttributes();

    constructor() {
        this.bpm = 120;
    }

    getSecondsPerQuarterNote(): number
    {
        return 60 / this.bpm;
    }
}

class PartState {
    private partDivisions = new Map<string, number>();

    setPartDivisions(name: string, divisions: number): void {
        this.partDivisions.set(name, divisions);
    }

    getPartDivisions(name: string): number {
        return this.partDivisions.get(name) ?? 1;
    }
}


export class PlaybackFactory {

    pbs : PlaybackState = new PlaybackState();
    ps : PartState = new PartState();

    reset()
    {
        this.pbs = new PlaybackState();
        this.ps = new PartState();
    }

    // The combined measures are now converted from quarter note timing
    // to timings in seconds. Taking into account the time data
    // as it is discovered.
    process(timeline: TimelineMeasure[]): PlaybackEvent[] {
        const playBackEvents:PlaybackEvent[] = [];

        let measureStartQN: number = 0;
        let currentTimeSeconds: number = 0;

        let measureNum = 1;

        for (const measure of timeline) {
            const measureEvents:PlaybackEvent[] = [];

            console.log("measure", measureNum, "start (QN)", measureStartQN, "time", currentTimeSeconds);

            // barline at start of each measure
            measureEvents.push({
                name:measure.name,
                timeSeconds: currentTimeSeconds,
                barline: true
            });

            // process the notes and any changes
            for (const ev of measure.events) {
                const eventQN = measureStartQN + ev.qnOffset;
                const eventTimeSeconds = eventQN * this.pbs.getSecondsPerQuarterNote();

                if ("attributes" in ev) {
                    this.pbs.ta.updateFromAttributes(ev.attributes);

                    // keep track of divisions for each part
                    if (ev.attributes.divisions !== undefined) {
                        this.ps.setPartDivisions(ev.id, ev.attributes.divisions);
                    }

                    // add an entry to represent key changes
                    const keys = normalizeKey(ev.attributes.key)
                    if (keys.length > 0) {
                        const key = keys[0];

                        const currentKey = {
                            fifths: Number(key.fifths),
                            mode: key.mode ?? "major"
                        };

                        measureEvents.push({
                            timeSeconds: eventTimeSeconds,
                            keyChange: true,
                            fifths: currentKey.fifths,
                            mode: currentKey.mode
                        });
                    }
                }

                if ("direction" in ev) {
                    const newBpm = getDirectionBpm(ev.direction);
                    if (newBpm) {
                        this.pbs.bpm = newBpm;
                    }
                }

                if ("note" in ev) {
                    const divisions = this.ps.getPartDivisions(ev.id);

                    let durationSeconds = 0;
                    if (typeof ev.note.duration === "number") {
                        const durationQN = ev.note.duration / divisions;
                        durationSeconds = durationQN * this.pbs.getSecondsPerQuarterNote();
                    }

                    measureEvents.push({
                        timeSeconds: eventTimeSeconds,
                        durationSeconds: durationSeconds,
                        note: ev.note,
                        id: ev.id,
                        performance: {hit: false}
                    });
                }
            }

            // 3. NOW generate beats (after processing events)
            const time = this.pbs.ta.time[0];
            const beatQN = 4 / time.beatType;

            for (let beatIndex = 0; beatIndex < time.beats; beatIndex++) {
                const beatQNOffset = beatIndex * beatQN;
                const beatTimeSeconds = (measureStartQN + beatQNOffset) * this.pbs.getSecondsPerQuarterNote();

                measureEvents.push({
                    beat: true,
                    beatNumber: beatIndex + 1,
                    timeSeconds: beatTimeSeconds
                });
            }

            // 4. Sort measure events
            measureEvents.sort((a, b) => a.timeSeconds - b.timeSeconds);

            // append them to the end
            playBackEvents.push(...measureEvents);

            // advance for next measure
            const measureLengthQN = this.pbs.ta.getMeasureLengthQN();
            measureStartQN += measureLengthQN;
            currentTimeSeconds += (measureLengthQN * this.pbs.getSecondsPerQuarterNote());

            console.log("measure end", measureNum, "length (QN)", measureLengthQN, "seconds", (measureLengthQN * this.pbs.getSecondsPerQuarterNote()));


            measureNum++;
        }
        return playBackEvents;
    }
}