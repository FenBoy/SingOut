// import {
//     type DivisionChange,
//     type MidiMeasure,
//     type MidiNote,
//     MidiPartInfo,
//     MidiScore,
//     type TempoChange
// } from "./midiTypes";
// import {type XmlLyric, type XmlPart, XmlScore} from "../MusicXml/mxmlTypes";
// import {getStartingKey} from "../MusicXml/mxmlUtils";
//
//
// export interface RawTempoEvent {
//     measureIndex: number;  // which measure the tempo change occurs in
//     localDiv: number;      // position inside the measure in divisions
//     bpm: number;           // new tempo
//     absoluteQN: number;     // GLOBAL position in quarter notes
// }
//
// function convertStepOctaveToMidi(step: string, octave: number): number {
//     const stepMap: Record<string, number> = {
//         C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11
//     };
//
//     const base = stepMap[step.toUpperCase()] ?? 0;
//     return base + (octave + 1) * 12;
// }
//
// function convertMuseScoreDynamicsToMidi(dyn: number): number {
//     // Clamp to sensible MIDI range
//     const clamped = Math.max(1, Math.min(dyn, 127));
//
//     // MuseScore values are already roughly in MIDI scale,
//     // so we simply round them.
//     return Math.round(clamped);
// }
//
// export function createTempoMap(rawTempoEvents: RawTempoEvent[]): TempoChange[] {
//     const tempoMap: TempoChange[] = rawTempoEvents.map(ev => ({
//         globalQN: ev.absoluteQN,
//         bpm: ev.bpm,
//         secondsAtChange: 0
//     }));
//
//     tempoMap.sort((a, b) => a.globalQN - b.globalQN);
//
//     if (tempoMap.length > 0) {
//         tempoMap[0].secondsAtChange = 0;
//
//         for (let i = 1; i < tempoMap.length; i++) {
//             const prev = tempoMap[i - 1];
//             const curr = tempoMap[i];
//
//             const deltaQN = curr.globalQN - prev.globalQN;
//             const deltaSeconds = deltaQN * (60 / prev.bpm);
//
//             curr.secondsAtChange = prev.secondsAtChange + deltaSeconds;
//         }
//     }
//
//     return tempoMap;
// }
//
// export function createDivisionTimeline(part: XmlPart): DivisionChange[] {
//     const timeline: DivisionChange[] = [];
//
//     let currentDivisions = 1;      // default if missing
//     let globalQN = 0;
//
//     for (let m = 0; m < part.measures.length; m++) {
//         const measure = part.measures[m];
//
//         // If measure has <divisions>, update currentDivisions
//         if (measure.divisions && measure.divisions.value > 0) {
//             currentDivisions = measure.divisions.value;
//         }
//
//         // Always push one entry per measure
//         timeline.push({
//             measureIndex: m,
//             localDivisions: currentDivisions,
//             globalQNPosition: globalQN
//         });
//
//         // Compute measure duration in divisions
//         let measureDivTotal = 0;
//         for (const ev of measure.events) {
//             if (ev.type === "backup" || ev.type === "forward") {
//                 measureDivTotal += ev.durationDiv ?? 0;
//             }
//             if(ev.type === "note" && ev.note.durationDiv != null)
//             {
//                 measureDivTotal += ev.note.durationDiv;
//             }
//         }
//
//         // Convert divisions → quarter notes
//         const measureQN = measureDivTotal / currentDivisions;
//         globalQN += measureQN;
//     }
//
//     return timeline;
// }
//
// /*
// export function createDivisionTimeline(part: XmlPart): DivisionChange[]
// {
//     const result: DivisionChange[] = [];
//
//     let currentDivisions = 1;
//     let currentGlobalQN = 0;
//
//     const measures = part.measures;
//
//     for (let m = 0; m < measures.length; m++) {
//         const measure = measures[m];
//
//         // A. If this measure has a <divisions> change, record it
//         if (measure.divisions != null) {
//             currentDivisions = measure.divisions.value;
//
//             result.push({
//                 localDivisions: currentDivisions,
//                 globalQNPosition: currentGlobalQN,
//                 measureIndex: m
//             });
//         }
//
//         // B. Compute measure length using event order
//         let localStartDiv = 0;
//
//         for (const event of measure.events) {
//
//             if (event.type === "backup") {
//                 localStartDiv -= event.durationDiv;
//             }
//
//             else if (event.type === "forward") {
//                 localStartDiv += event.durationDiv;
//             }
//
//             else if (event.type === "note") {
//                 const dur = event.note.durationDiv ?? 0;
//                 localStartDiv += dur;
//             }
//         }
//
//         // C. Convert measure length to QN
//         const measureQN = localStartDiv / currentDivisions;
//
//         // D. Advance global musical time
//         currentGlobalQN += measureQN;
//     }
//
//     return result;
// }
// */
//
// export function flattenPart(
//     part: XmlPart,
//     divisionTimeline: DivisionChange[]
// ): {
//     notes: MidiNote[];
//     tempoEvents: RawTempoEvent[];
// }
// {
//     const partId = part.id;
//
//     const notes: MidiNote[] = [];
//     const tempoEvents: RawTempoEvent[] = [];
//
//     const voicePositions = new Map<number, number>();
//     const activeTies = new Map<number, {
//         pitch: number;
//         startDiv: number;
//         durationDiv: number;
//         lyrics: XmlLyric[];
//         measureIndex: number;
//         scoreMeasureNumber: string;
//         partId: string;
//         voice: number;
//     }>();
//
//     for (let m = 0; m < part.measures.length; m++) {
//         const measure = part.measures[m];
//
//         voicePositions.clear();
//         activeTies.clear();
//
//         const divInfo = divisionTimeline[m];
//         const localDivisions = divInfo.localDivisions;
//         const measureGlobalQN = divInfo.globalQNPosition;
//
//         for (const event of measure.events) {
//
//             // BACKUP
//             if (event.type === "backup") {
//                 // this needs revisiting as we have multiple voices that need handling
//                 const v = 1;
//                 const pos = voicePositions.get(v) ?? 0;
//                 voicePositions.set(v, pos - event.durationDiv);
//                 continue;
//             }
//
//             // FORWARD
//             if (event.type === "forward") {
//                 // this needs revisiting as we have multiple voices that need handling
//                 const v = 1;
//                 const pos = voicePositions.get(v) ?? 0;
//                 voicePositions.set(v, pos + event.durationDiv);
//                 continue;
//             }
//
//             // TEMPO
//             if (event.type === "tempo") {
//                 // this needs revisiting as we have multiple voices that need handling
//                 const v = 1;
//                 const localDiv = voicePositions.get(v) ?? 0;
//                 const absoluteQN = measureGlobalQN + (localDiv / localDivisions);
//
//                 tempoEvents.push({
//                     measureIndex: m,
//                     localDiv,
//                     bpm: event.bpm,
//                     absoluteQN
//                 });
//
//                 continue;
//             }
//
//             // NOTE
//             if (event.type === "note") {
//                 const xmlNote = event.note;
//                 const voice = xmlNote.voice ?? 1;
//
//                 if (!voicePositions.has(voice)) voicePositions.set(voice, 0);
//
//                 const startDiv = voicePositions.get(voice)!;
//                 const durationDiv = xmlNote.durationDiv ?? 0;
//
//                 const absoluteQN = measureGlobalQN + (startDiv / localDivisions);
//
//                 // REST
//                 if (xmlNote.rest) {
//                     voicePositions.set(voice, startDiv + durationDiv);
//                     continue;
//                 }
//
//                 // PITCH
//                 let pitch = 0;
//                 if (!xmlNote.unpitched && xmlNote.step && xmlNote.octave != null) {
//                     pitch = convertStepOctaveToMidi(xmlNote.step, xmlNote.octave);
//                 }
//
//                 const velocityMidi = convertMuseScoreDynamicsToMidi(xmlNote.dynamic);
//                 const velocity = velocityMidi / 127;
//
//                 const hasStart = xmlNote.ties.some(t => t.type === "start");
//                 const hasStop = xmlNote.ties.some(t => t.type === "stop");
//
//                 // TIE START
//                 if (hasStart && !hasStop) {
//                     activeTies.set(voice, {
//                         pitch,
//                         startDiv,
//                         durationDiv,
//                         lyrics: xmlNote.lyrics ?? [],
//                         measureIndex: m,
//                         scoreMeasureNumber: measure.number,
//                         partId,
//                         voice
//                     });
//                 }
//
//                 // TIE STOP
//                 else if (hasStop && !hasStart) {
//                     const t = activeTies.get(voice);
//                     if (t) {
//                         t.durationDiv += durationDiv;
//
//                         const absQN = measureGlobalQN + (t.startDiv / localDivisions);
//
//                         notes.push({
//                             pitch: t.pitch,
//                             velocity,
//                             startDiv: t.startDiv,
//                             durationDiv: t.durationDiv,
//                             lyrics: t.lyrics,
//                             measureIndex: t.measureIndex,
//                             scoreMeasureNumber: t.scoreMeasureNumber,
//                             partId,
//                             voice,
//                             absoluteQN: absQN,
//                             hit: false,
//                             bestCents: 0
//                         });
//
//                         activeTies.delete(voice);
//                     }
//                 }
//
//                 // TIE CONTINUE
//                 else if (hasStart && hasStop) {
//                     const t = activeTies.get(voice);
//                     if (t) {
//                         t.durationDiv += durationDiv;
//
//                         const absQN = measureGlobalQN + (t.startDiv / localDivisions);
//
//                         notes.push({
//                             pitch: t.pitch,
//                             velocity,
//                             startDiv: t.startDiv,
//                             durationDiv: t.durationDiv,
//                             lyrics: t.lyrics,
//                             measureIndex: t.measureIndex,
//                             scoreMeasureNumber: t.scoreMeasureNumber,
//                             partId,
//                             voice,
//                             absoluteQN: absQN,
//                             hit: false,
//                             bestCents: 0
//                         });
//
//                         activeTies.delete(voice);
//                     }
//
//                     activeTies.set(voice, {
//                         pitch,
//                         startDiv,
//                         durationDiv,
//                         lyrics: xmlNote.lyrics ?? [],
//                         measureIndex: m,
//                         scoreMeasureNumber: measure.number,
//                         partId,
//                         voice
//                     });
//                 }
//
//                 // NORMAL NOTE
//                 else {
//                     notes.push({
//                         pitch,
//                         velocity,
//                         startDiv,
//                         durationDiv,
//                         lyrics: xmlNote.lyrics ?? [],
//                         measureIndex: m,
//                         scoreMeasureNumber: measure.number,
//                         partId,
//                         voice,
//                         absoluteQN,
//                         hit: false,
//                         bestCents: 0
//                     });
//                 }
//
//                 voicePositions.set(voice, startDiv + durationDiv);
//             }
//         }
//     }
//
//     return { notes, tempoEvents };
// }
//
//
// export function buildMeasureTimeline(score: XmlScore): MidiMeasure[] {
//     const measures: MidiMeasure[] = [];
//
//     const partMeasures = score.parts[0].measures;
//
//     let startQN = 0; // accumulated musical time
//
//     for (let i = 0; i < partMeasures.length; i++) {
//         const xmlMeasure = partMeasures[i];
//
//         // 1. Divisions for this measure
//         const divisions = xmlMeasure.divisions?.value ?? 1;
//
//         // 2. Walk events to compute measure length in divisions
//         let cursorDiv = 0;
//
//         for (const ev of xmlMeasure.events) {
//             switch (ev.type) {
//                 case "note": {
//                     const dur = ev.note.durationDiv ?? 0;
//                     cursorDiv += dur;
//                     break;
//                 }
//
//                 case "forward": {
//                     cursorDiv += ev.durationDiv;
//                     break;
//                 }
//
//                 case "backup": {
//                     cursorDiv -= ev.durationDiv;
//                     break;
//                 }
//
//                 // tempo, dynamics, etc. do not affect length
//                 default:
//                     break;
//             }
//         }
//
//         // 3. Convert divisions → QN
//         const durationQN = cursorDiv / divisions;
//
//         // 4. Emit measure
//         measures.push({
//             playbackIndex: i,
//             scoreNumber: xmlMeasure.number,
//             startQN,
//             durationQN,
//             divisions
//         });
//
//         // 5. Advance musical timeline
//         startQN += durationQN;
//     }
//
//     return measures;
// }
//
// export function mergeNotesAcrossParts(allPartNotes: MidiNote[][]): MidiNote[] {
//     const result: MidiNote[] = [];
//     const indices = new Array(allPartNotes.length).fill(0);
//
//     while (true) {
//         let bestPart = -1;
//         let bestNote: MidiNote | null = null;
//
//         for (let p = 0; p < allPartNotes.length; p++) {
//             const idx = indices[p];
//             const partNotes = allPartNotes[p];
//
//             if (idx >= partNotes.length) continue;
//
//             const note = partNotes[idx];
//
//             if (!bestNote || note.absoluteQN < bestNote.absoluteQN) {
//                 bestNote = note;
//                 bestPart = p;
//             }
//         }
//
//         if (bestPart === -1) break;
//
//         result.push(bestNote!);
//         indices[bestPart]++;
//     }
//
//     return result;
// }
//
//
//
// export function getScoreLengthSeconds(
//     score: MidiScore | null
// ): number {
//     if(!score) return 0;
//
//     if (score.measures.length === 0 || score.tempoMap.length === 0) return 0;
//
//     // 1. Total musical length in QN
//     const lastMeasure = score.measures[score.measures.length - 1];
//     const totalQN = lastMeasure.startQN + lastMeasure.durationQN;
//
//     // 2. Last tempo change
//     const lastTempo = score.tempoMap[score.tempoMap.length - 1];
//
//     // 3. Remaining QN after the last tempo change
//     const deltaQN = totalQN - lastTempo.globalQN;
//
//     // 4. Convert remaining QN → seconds
//     const remainingSeconds = deltaQN * (60 / lastTempo.bpm);
//
//     // 5. Total seconds = time at last tempo change + remaining time
//     return lastTempo.secondsAtChange + remainingSeconds;
// }
//
// export function createMidiScore(score: XmlScore): MidiScore
// {
//     const result = new MidiScore();
//
//     // ---------------------------------------------
//     // 1. Build division timelines for each part
//     // ---------------------------------------------
//     for (const part of score.parts) {
//         const partId = part.id;
//         const divisions = createDivisionTimeline(part);
//         result.partDivisions.set(partId, divisions);
//     }
//
//     // ---------------------------------------------
//     // 2. Flatten each part → notes + raw tempo events
//     // ---------------------------------------------
//     const allPartNotes: MidiNote[][] = [];
//     const allTempoEvents: RawTempoEvent[] = [];
//
//     for (const part of score.parts) {
//         const partId = part.id;
//         const divisions = result.partDivisions.get(partId)!;
//
//         console.log("Part", part.id,
//             "measures:", part.measures.length,
//             "divisionTimeline:", divisions.length);
//
//         const { notes, tempoEvents } = flattenPart(part, divisions);
//
//         allPartNotes.push(notes);
//         allTempoEvents.push(...tempoEvents);
//     }
//
//     // ---------------------------------------------
//     // 3. Merge notes across parts (musical order)
//     // ---------------------------------------------
//     const mergedNotes: MidiNote[] = mergeNotesAcrossParts(allPartNotes);
//     result.notes = mergedNotes;
//
//     // ---------------------------------------------
//     // 4. Build measure timeline (pure QN)
//     // ---------------------------------------------
//     const measureTimeline = buildMeasureTimeline(score);
//     result.measures = measureTimeline;
//
//     // ---------------------------------------------
//     // 5. Build tempo map (globalQN + secondsAtChange)
//     // ---------------------------------------------
//     const tempoMap = createTempoMap(allTempoEvents);
//     result.tempoMap = tempoMap;
//
//     // ---------------------------------------------
//     // 6. Metadata
//     // ---------------------------------------------
//     result.startingKey = getStartingKey(score);
//
//     result.partInfo = score.scoreParts.map(sp =>
//         new MidiPartInfo(
//             sp.id,
//             sp.partName ?? null,
//             false,
//             1.0
//         )
//     );
//
//     if (score.workTitle != null)
//         result.title = score.workTitle;
//
//     return result;
// }