// now we start trying to make sense of the content
import {
    getDivisions,
    getMeasureEvents,
    getMeasures, getPartIndexFromScore, getParts, normalizeKey, normalizeTime,
    type XmlMeasure,
    type XmlNote,
    type XmlPart, type XmlScorePart,
    type XmlScorePartwise
} from "./helpers";

// for converting the xml data into a timeline

interface TimelineBase {
    tick: number;
}

export interface TimelineNote extends TimelineBase {
    note: XmlNote;
    divisions: number;
}

export interface TimelineTempo extends TimelineBase {
    bpm: number;
}

export interface TimelineBarline extends TimelineBase {
    barline: true;
    measureNumber: number;
}

export interface TimelineBeat extends TimelineBase {
    beat: true;
    beatNumber: number; // 1,2,3,4 for 4/4
}

export interface TimelineKeyChange extends TimelineBase {
    keyChange: true;
    fifths: number; // MusicXML <key><fifths>
    mode: string;   // major/minor
}

export type TimelineEvent =
    | TimelineNote
    | TimelineTempo
    | TimelineBarline
    | TimelineBeat
    | TimelineKeyChange;

// this extracts the timeline events for the measure
// it uses a cursor to correctly position element
// by calculating the tick for the element
// based on the ppq (ticks per quarter note)
// when "back" and "forward" are encountered
// timeline events are either notes, or tempo changes
export function buildMeasureTimeline(
    measure: XmlMeasure,
    ppq: number
): TimelineEvent[] {
    const events = getMeasureEvents(measure);
    const divisions = getDivisions(measure);

    const timeline: TimelineEvent[] = [];
    let cursor = 0;

    for (const ev of events) {
        switch (ev.type) {
            case "note": {
                const durDiv = ev.note.duration ?? 0;
                const durTicks = Math.round((durDiv / divisions) * ppq);

                timeline.push({ tick: cursor, note: ev.note, divisions});
                cursor += durTicks;
                break;
            }

            case "backup": {
                const durDiv = ev.backup.duration ?? 0;
                // const durTicks = Math.round((durDiv / divisions) * ppq);
                cursor -= durDiv;
                break;
            }

            case "forward": {
                const durDiv = ev.forward.duration ?? 0;
                // const durTicks = Math.round((durDiv / divisions) * ppq);
                cursor += durDiv;
                break;
            }

            case "tempo": {
                timeline.push({
                    tick: cursor,
                    bpm: ev.tempo.bpm
                });
                break;
            }

            case "direction":
            case "barline":
                break;
        }
    }

    return timeline;
}

export function buildPartTimeline(
    part: XmlPart,
    ppq: number
): TimelineEvent[] {
    const measures = getMeasures(part);
    const timeline: TimelineEvent[] = [];

    let cursor = 0;

    for (const measure of measures) {

        // ⭐ 1. Insert BARLINE event
        timeline.push({
            tick: cursor,
            barline: true,
            measureNumber: Number(measure["@_number"])
        });

        // ⭐ 2. Insert KEY CHANGE event (if present)
        const rawKey = measure.attributes?.key;
        const keys = normalizeKey(rawKey);

        for (const key of keys) {
            timeline.push({
                tick: cursor,
                keyChange: true,
                fifths: Number(key.fifths ?? 0),
                mode: key.mode ?? "major"
            });
        }

        // ⭐ 3. Build measure timeline (notes + tempo)
        const divisions = getDivisions(measure);
        const measureTimeline = buildMeasureTimeline(measure, ppq);

        // ⭐ 3b. Compute measure duration IN TICKS (correct)
        let measureDurationTicks = measureTimeline
            .filter((ev): ev is TimelineNote => "note" in ev)
            .reduce((max, ev) => {
                // duration is in quarter-note units → convert to ticks
                const durTicks = Math.round(((ev.note.duration ?? 0) / divisions) * ppq);
                return Math.max(max, ev.tick + durTicks);
            }, 0);


        // ⭐ 4. Fallback to time signature ONLY if no notes exist
        if (measureDurationTicks === 0) {
            const times = normalizeTime(measure.attributes?.time);
            const time = times[0] ?? { beats: 4, "beat-type": 4 };

            const beatsRaw = Array.isArray(time.beats) ? time.beats[0] : time.beats;
            const beatTypeRaw = Array.isArray(time["beat-type"]) ? time["beat-type"][0] : time["beat-type"];

            const beats = Number(beatsRaw ?? 4);
            const beatType = Number(beatTypeRaw ?? 4);

            // duration in ticks
            const ticksPerBeat = ppq * (4 / beatType);
            measureDurationTicks = beats * ticksPerBeat;
        }


        // ⭐ 5. Insert measure events (notes + tempo) — MUST come BEFORE beats
        for (const ev of measureTimeline) {
            if ("note" in ev) {
                timeline.push({
                    tick: cursor + ev.tick,
                    note: ev.note,
                    divisions: ev.divisions
                });
            } else if ("bpm" in ev) {
                timeline.push({
                    tick: cursor + ev.tick,
                    bpm: ev.bpm
                });
            }
        }

// ⭐ 6. Insert BEATS in correct tick order
        let beatTick = cursor;
        let beatNumber = 1;

        while (beatTick < cursor + measureDurationTicks) {
            const beatEvent: TimelineBeat = {
                tick: beatTick,
                beat: true,
                beatNumber
            };

            // Insert beat in sorted order
            const insertIndex = timeline.findIndex(ev => ev.tick > beatTick);
            if (insertIndex === -1) {
                timeline.push(beatEvent);
            } else {
                timeline.splice(insertIndex, 0, beatEvent);
            }

            beatTick += ppq;
            beatNumber++;
        }


        // ⭐ 7. Advance cursor
        cursor += measureDurationTicks;
    }

    return timeline;
}


export function buildScoreTimelines(
    score: XmlScorePartwise,
    ppq: number
): TimelineEvent[][] {
    const parts = getParts(score);

    return parts.map(part => buildPartTimeline(part, ppq));
}

export function getTimelineForPart(
    timelines: TimelineEvent[][],
    score: XmlScorePartwise,
    selected: XmlScorePart
): TimelineEvent[] {
    const index = getPartIndexFromScore(score, selected);
    if (index < 0) return []; // part not found
    return timelines[index];
}

// to help with drawing bar lines

export function getMeasureStartTicks(part: XmlPart, ppq: number): number[] {
    const measures = getMeasures(part);
    const starts: number[] = [];

    let cursor = 0;

    for (const measure of measures) {
        starts.push(cursor);

        const measureTimeline = buildMeasureTimeline(measure, ppq);

        const divisions = getDivisions(measure);

        const measureDurationDiv = measureTimeline
            .filter((ev): ev is TimelineNote => "note" in ev)
            .reduce((max, ev) => {
                const durDiv = ev.note.duration ?? 0;
                return Math.max(max, ev.tick + durDiv);
            }, 0);

        const measureDurationTicks = Math.round(
            (measureDurationDiv / divisions) * ppq
        );

        cursor += measureDurationTicks;
    }

    return starts;
}

export function convertTicksToSeconds(
    tick: number,
    timeline: TimelineEvent[],
    ppq: number
): number {
    const tempos = timeline.filter((ev): ev is TimelineTempo => "bpm" in ev);

    if (tempos.length === 0) return 0;

    tempos.sort((a, b) => a.tick - b.tick);

    let seconds = 0;
    let lastTick = 0;

    for (let i = 0; i < tempos.length; i++) {
        const curr = tempos[i];
        const next = tempos[i + 1];

        const bpm = curr.bpm;
        const secPerTick = 60 / (bpm * ppq);

        const nextTick = next ? next.tick : tick;

        if (tick <= nextTick) {
            const delta = tick - lastTick;
            seconds += delta * secPerTick;
            return seconds;
        }

        const region = nextTick - lastTick;
        seconds += region * secPerTick;
        lastTick = nextTick;
    }

    return seconds;
}
