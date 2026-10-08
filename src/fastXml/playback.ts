import {
    type TimelineMeasure
} from "./timeline";
import {
    getDirectionBpm,
    getLyricText, normalizeKey,
    type XmlNote,
} from "./helpers";
import {TimeAttributes} from "./timeAttributes";


// the tick resolution
export const PPQ = 480;

// for processing the timeline in order
// and applying tempo changes
// to schedule notes at times and durations
// in seconds

export interface Performance {
    hit : boolean;
    cents?: number;
}

interface PlaybackBase {
    timeSeconds: number;
}

export interface PlaybackNote extends PlaybackBase {
    durationSeconds: number;
    note: XmlNote;
    performance: Performance;
    id: string; // part id
}

export interface PlaybackTempo extends PlaybackBase {
    bpm: number;
}

export interface PlaybackBarline extends PlaybackBase {
    name: string;
    barline: true;
}

export interface PlaybackBeat extends PlaybackBase {
    beatNumber: number;
    beat: true;
}

export interface PlaybackKeyChange extends PlaybackBase {
    fifths: number;
    mode: string;
    keyChange: true;
}

export type PlaybackEvent =
    | PlaybackNote
    | PlaybackTempo
    | PlaybackBarline
    | PlaybackBeat
    | PlaybackKeyChange;

export function isPlaybackNote(ev: PlaybackEvent): ev is PlaybackNote {
    return "note" in ev;
}

export function hasPitch(ev: PlaybackNote): boolean {
    return ev.note.pitch !== undefined && ev.note.rest !== true;
}

export function isPlaybackTempo(ev: PlaybackEvent): ev is PlaybackTempo {
    return "bpm" in ev;
}

export function isBarline(ev: PlaybackEvent): ev is PlaybackBarline {
    return "barline" in ev;
}

export function isBeat(ev: PlaybackEvent): ev is PlaybackBeat {
    return "beat" in ev;
}

export function isKeyChange(ev: PlaybackEvent): ev is PlaybackKeyChange{
    return "keyChange" in ev;
}

export function getPlaybackScoreLengthSeconds(
    playback: PlaybackEvent[]
): number {
    let maxSeconds = 0;

    for (const ev of playback) {
        if (isPlaybackNote(ev)) {
            const raw = ev.durationSeconds;
            const duration = typeof raw === "number" ? raw : 0;
            const end = ev.timeSeconds + duration;

            if (end > maxSeconds) {
                maxSeconds = end;
            }
        }
    }

    return maxSeconds;
}

export function getEventsForPart(
    playback: PlaybackEvent[],
    id: string
): PlaybackEvent[] {
    return playback.filter(ev =>
        ("id" in ev && ev.id === id) || ("keyChange" in ev) || (("bpm" in ev))
    );
}

export function getBarsAndBeats(
    playback: PlaybackEvent[]
): (PlaybackBeat | PlaybackBarline)[] {
    return playback.filter((ev): ev is PlaybackBeat | PlaybackBarline =>
        ("beat" in ev) || ("barline" in ev)
    );
}

// Note: the following methods are used for displaying data
// about the current part (the part being practised)
// in the PianoRoll. The events have already been filtered
// so we don't need to filter for a matching part id
export function getPlaybackNoteAtTime(
    playback: PlaybackEvent[],
    t: number
): PlaybackNote | null {
    const ev = playback.find(
        (ev): ev is PlaybackNote =>
            isPlaybackNote(ev) &&
            t >= ev.timeSeconds &&
            t < ev.timeSeconds + ev.durationSeconds
    );

    return ev ?? null;
}

export function getActiveLyric(playback: PlaybackEvent[], t: number): string | null {
    const note = getPlaybackNoteAtTime(playback, t);
    return note ? getLyricText(note.note) : null;
}

export function getApproachingLyrics(
    playback: PlaybackEvent[],
    t: number,
    windowSeconds: number
): string[] {
    return playback
        .filter((ev): ev is PlaybackNote =>
            isPlaybackNote(ev) &&
            ev.timeSeconds > t &&
            ev.timeSeconds <= t + windowSeconds
        )
        .map(ev => getLyricText(ev.note))
        .filter(Boolean);
}


// back to things that apply to all parts

export function getStartingTempoFromPlayback(
    playback: PlaybackEvent[]
): number {

    if (playback.length === 0) {
        return 120;
    }

    const startTime = playback[0].timeSeconds;

    // Scan all events at the starting time
    for (let i = 0; i < playback.length && playback[i].timeSeconds === startTime; i++) {
        const ev = playback[i];
        if (isPlaybackTempo(ev)) {
            return ev.bpm;
        }
    }

    return 120;
}

export function getStartingKeyFromPlayback(
    playback: PlaybackEvent[]
): PlaybackKeyChange {

    if (playback.length > 0) {
        const startTime = playback[0].timeSeconds;

        // Scan all events at the starting time
        for (let i = 0; i < playback.length && playback[i].timeSeconds === startTime; i++) {
            const ev = playback[i];
            if ("keyChange" in ev) {
                return ev;
            }
        }
    }

    // Default: C major
    return {
        timeSeconds: 0,
        keyChange: true,
        fifths: 0,
        mode: "major"
    };
}

export function getPlayback(timeline:TimelineMeasure[]): PlaybackEvent[]
{
    const playBackEvents:PlaybackEvent[] = [];

    let bpm = 120;
    let secondsPerQN = 60 / bpm;

    const timeAttributes = new TimeAttributes();
    let measureStartQN: number = 0;
    let currentTimeSeconds: number = 0;

    const partState: Record<string, { divisions: number }> = {};

    for (const measure of timeline) {
        const measureEvents:PlaybackEvent[] = [];

        // barline at start
        measureEvents.push({
            name:measure.name,
            timeSeconds: currentTimeSeconds,
            barline: true
        });

        // process the notes and any changes
        for (const ev of measure.events) {

            // make sure we have divisions for this part
            if (!(ev.id in partState)) {
                partState[ev.id] = { divisions: 1 };
            }

            const divisions = partState[ev.id].divisions;

            const eventQN = measureStartQN + (ev.qnOffset / divisions);
            const eventTimeSeconds = eventQN * secondsPerQN;

            if ("attributes" in ev) {
                timeAttributes.updateFromAttributes(ev.attributes);

                // keep track of divisions for each part
                if (ev.attributes.divisions !== undefined) {
                    partState[ev.id].divisions = ev.attributes.divisions;
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
                    bpm = newBpm;
                    secondsPerQN = 60 / bpm;
                }
            }

            if ("note" in ev) {
                const divisionsForPart = partState[ev.id].divisions;

                let durationSeconds = 0;
                if (typeof ev.note.duration === "number") {
                    const durationQN = ev.note.duration / divisionsForPart;
                    durationSeconds = durationQN * secondsPerQN;
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
        const time = timeAttributes.time[0];
        const beatQN = 4 / time.beatType;

        for (let beatIndex = 0; beatIndex < time.beats; beatIndex++) {
            const beatQNOffset = beatIndex * beatQN;
            const beatTimeSeconds = (measureStartQN + beatQNOffset) * secondsPerQN;

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
        measureStartQN += timeAttributes.getMeasureLengthQN();
        currentTimeSeconds = measureStartQN * secondsPerQN;
    }
    return playBackEvents;
}