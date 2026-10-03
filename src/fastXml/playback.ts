import {
    buildScoreTimelines, type TimelineEvent
} from "./timeline";
import {getLyricText, getPartIndexFromScore, type XmlNote, type XmlScorePart, type XmlScorePartwise} from "./helpers";

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
}

export interface PlaybackTempo extends PlaybackBase {
    bpm: number;
}

export interface PlaybackBarline extends PlaybackBase {
    measureNumber: number;
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

export function applyTempoToTimeline(
    timeline: TimelineEvent[],
    ppq: number
): PlaybackEvent[] {

    // Ensure events are sorted by tick
    const sorted = [...timeline].sort((a, b) => a.tick - b.tick);

    const playback: PlaybackEvent[] = [];

    let currentBpm = 120; // default if no tempo yet
    let lastTick = 0;
    let lastTimeSeconds = 0;

    for (const ev of sorted) {

        // Convert tick delta → seconds delta
        const tickDelta = ev.tick - lastTick;
        const secondsPerTick = (60 / currentBpm) / ppq;
        const timeDelta = tickDelta * secondsPerTick;

        const eventTimeSeconds = lastTimeSeconds + timeDelta;

        // ⭐ PlaybackNote
        if ("note" in ev) {
            const rawDiv = ev.note.duration;
            const durationSeconds =
                typeof rawDiv === "number"
                    ? (rawDiv / ev.divisions) * (60 / currentBpm)
                    : 0;

            playback.push({
                timeSeconds: eventTimeSeconds,
                durationSeconds,
                note: ev.note,
                performance: { hit: false }
            });
        }


        // ⭐ PlaybackTempo
        else if ("bpm" in ev) {
            currentBpm = ev.bpm;
            playback.push({
                timeSeconds: eventTimeSeconds,
                bpm: ev.bpm
            });
        }

        // ⭐ PlaybackBarline
        else if ("barline" in ev) {
            playback.push({
                timeSeconds: eventTimeSeconds,
                measureNumber: ev.measureNumber,
                barline: true
            });
        }

        // ⭐ PlaybackBeat
        else if ("beat" in ev) {
            playback.push({
                timeSeconds: eventTimeSeconds,
                beatNumber: ev.beatNumber,
                beat: true
            });
        }

        // ⭐ PlaybackKeyChange
        else if ("keyChange" in ev) {
            playback.push({
                timeSeconds: eventTimeSeconds,
                fifths: ev.fifths,
                mode: ev.mode,
                keyChange: true
            });
        }

        // Update running state
        lastTick = ev.tick;
        lastTimeSeconds = eventTimeSeconds;
    }

    return playback;
}


export function buildScorePlayback(
    score: XmlScorePartwise | null,
    ppq: number
): PlaybackEvent[][] {
    if(score == null) return [];

    const partTimelines = buildScoreTimelines(score, ppq);

    return partTimelines.map(timeline =>
        applyTempoToTimeline(timeline, ppq)
    );
}

export function getPlaybackScoreLengthSeconds(
    playback: PlaybackEvent[][]
): number {
    let maxSeconds = 0;

    for (const part of playback) {
        for (const ev of part) {
            if (isPlaybackNote(ev)) {
                const raw = ev.durationSeconds;
                const duration = typeof raw === "number" ? raw : 0;
                const end = ev.timeSeconds + duration;

                if (end > maxSeconds) {
                    maxSeconds = end;
                }
            }
        }
    }

    return maxSeconds;
}

export function getStartingTempoFromPlayback(
    playback: PlaybackEvent[][]
): number {
    let firstTempo: number | null = null;

    for (const part of playback) {
        for (const ev of part) {
            if ("bpm" in ev) {
                if (firstTempo === null || ev.timeSeconds < firstTempo) {
                    firstTempo = ev.bpm;
                }
            }
        }
    }

    return firstTempo ?? 120; // fallback if no tempo found
}

export function getPlaybackForPart(
    playback: PlaybackEvent[][],
    score: XmlScorePartwise | null,
    selected: XmlScorePart | null
): PlaybackEvent[] {

    if(score == null || selected == null) return [];

    const index = getPartIndexFromScore(score, selected);
    return index >= 0 ? playback[index] : [];
}

export function getPlaybackNoteAtTime(
    playback: PlaybackEvent[],
    t: number
): PlaybackNote | null {
    const ev = playback.find(
        (e): e is PlaybackNote =>
            isPlaybackNote(e) &&
            t >= e.timeSeconds &&
            t < e.timeSeconds + e.durationSeconds
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