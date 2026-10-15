// now we start trying to make sense of the content
import {
    type XmlAttributes, type XmlDirection,
    type XmlNote
} from "./helpers";

export interface TimelineBaseEvent {
    id: string;         // add the part id here, so that we can merge parts later and retain info
    qnOffset: number;
    kind: "note" | "direction" | "attributes";
}

// for putting notes in tick order
export interface TimelineNote extends TimelineBaseEvent {
    kind: "note";
    note: XmlNote;
}

export interface TimelineDirection extends TimelineBaseEvent {
    kind: "direction";
    direction: XmlDirection;
}

export interface TimelineAttributes extends TimelineBaseEvent {
    kind: "attributes";
    attributes: XmlAttributes;
}

export type TimelineEvent =
    | TimelineNote
    | TimelineDirection
    | TimelineAttributes;

export interface TimelineMeasure {
    name: string;
    events: TimelineEvent[];
}

//
// export function isPlaceholder(ev: XmlMeasureEvent, events: XmlMeasureEvent[]): boolean {
//     if (ev.type !== "note") return false;
//
//     const pitch = ev.note.pitch;
//     if (!pitch) return false; // rests never placeholders
//
//     // Must be A4
//     const isA4 =
//         pitch.step === "A" &&
//         pitch.octave === "4" &&
//         (pitch.alter ?? 0) === 0;
//
//     if (!isA4) return false;
//
//     // Check if this voice has any real notes
//     const hasRealNotesInVoice = events.some(e =>
//         e.type === "note" &&
//         e.note.voice === ev.note.voice &&                // same voice
//         e.note.pitch !== undefined &&    // pitched
//         e.note.rest !== true             // not a rest
//     );
//
//     // Placeholder = pitched A4 AND voice has no real notes
//     return !hasRealNotesInVoice;
// }
//
// // this extracts the timeline events for the measure
// // it will contain either notes or directions
// // they will be in quarter note order
// export function getTimelineEventsForMeasure(
//     id: string,
//     measure: XmlMeasure,
// ): TimelineMeasure {
//     const events = getMeasureEvents(measure);
//
//     // ⭐ One cursor per voice
//     const voiceCursors = new Map<number, number>();
//     let currentVoice = 1;
//
//     // this is wrong, it can come from the previous setting
//     let currentDivisions = 1;
//
//     // copy across the attributes for the measure
//     const tm: TimelineMeasure = {
//         name: measure["@_number"],
//         events: []
//     };
//
//     // then reorganize the note data into time order
//     for (const ev of events) {
//         switch (ev.type) {
//             case "note": {
//                 currentVoice = normalizeVoice(ev.note.voice)
//
//                 const cursor = voiceCursors.get(currentVoice) ?? 0;
//                 tm.events.push({ id: id, qnOffset: cursor, note: ev.note});
//
//                 const dur = getEffectiveDuration(ev.note,currentDivisions);
//                 voiceCursors.set(currentVoice, cursor + dur);
//                 break;
//             }
//
//             case "backup": {
//                 const cursor = voiceCursors.get(currentVoice) ?? 0;
//                 const raw = ev.backup.duration ?? 0;
//                 const durQN = raw / currentDivisions;
//                 voiceCursors.set(currentVoice, cursor - durQN);
//                 break;
//             }
//
//             case "forward": {
//                 const cursor = voiceCursors.get(currentVoice) ?? 0;
//                 const raw = ev.forward.duration ?? 0;
//                 const durQN = raw / currentDivisions;
//                 voiceCursors.set(currentVoice, cursor + durQN);
//                 break;
//             }
//
//
//             case "direction": {
//                     // directions belong to the current voice cursor
//                     const cursor = voiceCursors.get(currentVoice) ?? 0;
//
//                     tm.events.push({
//                         id,
//                         qnOffset: cursor,
//                         direction: ev.direction
//                     });
//                     break;
//             }
//
//             case "attributes": {
//                     const cursor = voiceCursors.get(currentVoice) ?? 0;
//
//                     tm.events.push({
//                         id,
//                         qnOffset: cursor,
//                         attributes: ev.attributes
//                     });
//
//                     if (typeof ev.attributes.divisions === "number") {
//                         currentDivisions = ev.attributes.divisions;
//                     }
//
//                     break;
//             }
//         }
//     }
//
//     // ⭐ Ensure events are in tick order
//     tm.events.sort((a, b) => a.qnOffset - b.qnOffset);
//
//     return tm;
// }
//
// // get a collection of the timeline events for all of the measures
// export function getTimeLineEventsForPart(
//     part: XmlPart
// ): TimelineMeasure[] {
//     const measures = getMeasures(part);
//     const timeline: TimelineMeasure[] = [];
//
//     for (const measure of measures) {
//         // organize the measure so that the timeline events are in time order
//         // for that measure
//         timeline.push(getTimelineEventsForMeasure(part["@_id"], measure));
//     }
//
//     return timeline;
// }
//
// // where the array contains
// // - part
// // -- measures
// // --- events within measure (in order)
// export function getTimeLineEventsForScore(
//     score: XmlScorePartwise
// ): TimelineMeasure[][] {
//
//     const parts = getParts(score);
//     return parts.map(part => getTimeLineEventsForPart(part));
// }
//
// export function getMergedTimeline(score: XmlScorePartwise): TimelineMeasure[]
// {
//     const allParts = getTimeLineEventsForScore(score);
//     if(allParts.length == 0) return [];
//
//     const numMeasures = allParts[0].length;
//     let isValid = true;
//     // all parts must have the same number of measures
//     for(let partIndex = 0;  partIndex < allParts.length; partIndex++) {
//         if(allParts[partIndex].length != numMeasures) {
//             isValid = false;
//             // we could throw an exception
//         }
//     }
//
//     if(!isValid) return[];
//
//     const mergedTimeline: TimelineMeasure[] = [];
//
//     for(let measureIndex = 0; measureIndex < allParts[0].length; measureIndex++) {
//             const mergedMeasure: TimelineMeasure = {name: allParts[0][measureIndex].name, events: []};
//             for(let partIndex = 0;  partIndex < allParts.length; partIndex++) {
//                 mergedMeasure.events.push(...allParts[partIndex][measureIndex].events);
//                 }
//             mergedMeasure.events.sort((a, b) => a.qnOffset - b.qnOffset);
//             mergedTimeline.push(mergedMeasure);
//     }
//
//     return mergedTimeline;
// }
