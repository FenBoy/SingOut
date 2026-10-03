import {
    type XmlScorePart,
    XmlScore,
    type XmlPart,
    type XmlMeasure,
    type XmlNote,
    type XmlKey,
    type XmlLyric, type XmlDivisions, type XmlBarline, type XmlDynamicMark, type XmlHairpin,
    type XmlNumericDynamic, type XmlFermata, type XmlSlur, type XmlDynamic, type XmlTie,
    type XmlMeasureEvent, type XmlJump
} from "./mxmlTypes";

// so that different XML document sources can be used
export interface XmlDoc {
    querySelector(selector: string): Element | null;
    querySelectorAll(selector: string): NodeListOf<Element>;
    getElementsByTagName(tag: string): HTMLCollectionOf<Element>;
    documentElement: Element;
}

export function parseScoreParts(xml: XmlDoc): XmlScorePart[] {
    const results: XmlScorePart[] = [];

    const scoreParts = Array.from(xml.querySelectorAll("score-part"));

    scoreParts.forEach(scorePart => {
        const id = scorePart.getAttribute("id") || "";

        const partNameNode = scorePart.querySelector("part-name");
        const partAbbrevNode = scorePart.querySelector("part-abbreviation");

        const midiInstrument = scorePart.querySelector("midi-instrument");

        const instrNode = scorePart.querySelector("instrument-name");
        const instrumentName = instrNode?.textContent?.trim() || null;

        const soundNode = scorePart.querySelector("instrument-sound");
        const instrumentSound = soundNode?.textContent?.trim() || null;

        let midi = null;

        if (midiInstrument) {
            const channelNode = midiInstrument.querySelector("midi-channel");
            const programNode = midiInstrument.querySelector("midi-program");
            const volumeNode = midiInstrument.querySelector("volume");
            const panNode = midiInstrument.querySelector("pan");

            midi = {
                channel: channelNode ? parseInt(channelNode.textContent || "0", 10) : null,
                program: programNode ? parseInt(programNode.textContent || "0", 10) : null,
                volume: volumeNode ? parseInt(volumeNode.textContent || "0", 10) : null,
                pan: panNode ? parseInt(panNode.textContent || "0", 10) : null
            };
        }

        results.push({
            id,
            partName: partNameNode?.textContent?.trim() || null,
            partAbbreviation: partAbbrevNode?.textContent?.trim() || null,
            instrumentName,
            instrumentSound,
            midi
        });
    });

    return results;
}

export function parseXmlTie(tieNode: Element): XmlTie {
    const type = tieNode.getAttribute("type") as "start" | "stop";
    return { type };
}

export function parseXmlTies(noteNode: Element): XmlTie[] {
    const tieNodes = Array.from(noteNode.querySelectorAll("notations > tied"));
    return tieNodes.map(node => parseXmlTie(node));
}


export function parseXmlSlur(slurNode: Element): XmlSlur {
    const type = slurNode.getAttribute("type") as "start" | "stop";
    const number = slurNode.getAttribute("number");

    return {
        type,
        number
    };
}

export function parseXmlSlurs(noteNode: Element): XmlSlur[] {
    const slurs: XmlSlur[] = [];

    const slurNodes = Array.from(noteNode.querySelectorAll("notations > slur"));
    slurNodes.forEach(node => {
        slurs.push(parseXmlSlur(node));
    });

    return slurs;
}


export function parseXmlFermata(fermataNode: Element): XmlFermata {
    const type = fermataNode.getAttribute("type");
    return {
        type: type || null
    };
}

export function parseXmlFermatas(measureNode: Element): XmlFermata[] {
    const fermatas: XmlFermata[] = [];

    const directionNodes = Array.from(measureNode.querySelectorAll("direction"));

    directionNodes.forEach(dir => {
        const fermataNode = dir.querySelector("direction-type > fermata");
        if (fermataNode) {
            fermatas.push(parseXmlFermata(fermataNode));
        }
    });

    return fermatas;
}

export function parseXmlDynamicMark(dynNode: Element): XmlDynamicMark | null {
    const child = dynNode.firstElementChild;
    if (!child) return null;

    return {
        type: "mark",
        value: child.tagName.toLowerCase()
    };
}

export function parseXmlHairpin(wedgeNode: Element): XmlHairpin | null {
    const direction = wedgeNode.getAttribute("type");
    if (!direction) return null;

    return {
        type: "hairpin",
        direction: direction as "crescendo" | "diminuendo"
    };
}

export function parseXmlNumericDynamic(soundNode: Element): XmlNumericDynamic | null {
    const dynAttr = soundNode.getAttribute("dynamics");
    if (!dynAttr) return null;

    return {
        type: "numeric",
        value: parseInt(dynAttr, 10)
    };
}

export function parseXmlDynamics(measureNode: Element): XmlDynamic[] {
    const dynamics: XmlDynamic[] = [];

    const directionNodes = Array.from(measureNode.querySelectorAll("direction"));

    directionNodes.forEach(dir => {
        // written marks
        const dynNode = dir.querySelector("direction-type > dynamics");
        if (dynNode) {
            const mark = parseXmlDynamicMark(dynNode);
            if (mark) dynamics.push(mark);
        }

        // hairpins
        const wedgeNode = dir.querySelector("direction-type > wedge");
        if (wedgeNode) {
            const hairpin = parseXmlHairpin(wedgeNode);
            if (hairpin) dynamics.push(hairpin);
        }

        // numeric dynamics
        const soundNode = dir.querySelector("sound");
        if (soundNode) {
            const numeric = parseXmlNumericDynamic(soundNode);
            if (numeric) dynamics.push(numeric);
        }
    });

    return dynamics;
}

export function parseXmlKey(keyNode: Element): XmlKey {
    const fifthsNode = keyNode.querySelector("fifths");
    const modeNode = keyNode.querySelector("mode");

    return {
        fifths: fifthsNode ? parseInt(fifthsNode.textContent || "0", 10) : null,
        mode: modeNode?.textContent?.trim() || null
    };
}

export function parseXmlLyric(lyricNode: Element): XmlLyric {
    const number = lyricNode.getAttribute("number");

    const syllabicNode = lyricNode.querySelector("syllabic");
    const textNode = lyricNode.querySelector("text");

    return {
        number,
        syllabic: syllabicNode?.textContent?.trim() || null,
        text: textNode?.textContent?.trim() || null
    };
}

export function parseXmlNote(noteNode: Element): XmlNote {

    // detect rest
    const restNode = noteNode.querySelector("rest");

    // pitch
    const pitchNode = noteNode.querySelector("pitch");
    const stepNode = pitchNode?.querySelector("step");
    const octaveNode = pitchNode?.querySelector("octave");

    // just default to something mid-range
    let dynamic:number = 64;

    const dynAttr = noteNode.getAttribute("dynamics");
    if (dynAttr !== null) {
        dynamic = parseFloat(dynAttr);
    }

    // simple fields
    const durationNode = noteNode.querySelector("duration");
    const voiceNode = noteNode.querySelector("voice");

    // Lyrics
    const lyricNodes = Array.from(noteNode.querySelectorAll("lyric"));
    const lyrics = lyricNodes.map(lyricNode => parseXmlLyric(lyricNode));

    const slurs = parseXmlSlurs(noteNode);
    const ties = parseXmlTies(noteNode);

    // filter out percussion
    const unpitchedNode = noteNode.querySelector("unpitched");

    return {
        step: stepNode?.textContent?.trim() || null,
        octave: octaveNode ? parseInt(octaveNode.textContent || "0", 10) : null,
        durationDiv: durationNode ? parseInt(durationNode.textContent || "0", 10) : null,
        voice: voiceNode ? parseInt(voiceNode.textContent || "0", 10) : null,
        lyrics: lyrics,
        slurs: slurs,
        ties: ties,
        unpitched:!!unpitchedNode,
        rest: !!restNode,
        dynamic:dynamic
    };
}

export function parseXmlBarline(barlineNode: Element): XmlBarline {
    const location = barlineNode.getAttribute("location") || null;

    const styleNode = barlineNode.querySelector("bar-style");
    const repeatNode = barlineNode.querySelector("repeat");

    return {
        location,
        style: styleNode?.textContent?.trim() || null,
        repeat: repeatNode?.getAttribute("direction") || null
    };
}

export function parseXmlBarlines(measureNode: Element): XmlBarline[] {
    const barlineNodes = Array.from(measureNode.getElementsByTagName("barline"));

    return barlineNodes.map(node => parseXmlBarline(node));
}

export function parseXmlDivisions(attributesNode: Element): XmlDivisions | null {
    const divNode = attributesNode.querySelector("divisions");
    if (!divNode) return null;

    const value = parseInt(divNode.textContent || "0", 10);
    return { value };
}

function convertMetronomeToBpm(beatUnit: string, metroNode: Element, perMinute: number): number {
    const baseFactors: Record<string, number> = {
        quarter: 1,
        eighth: 0.5,
        half: 2,
        whole: 4,
    };

    const factor = baseFactors[beatUnit] ?? 1;

    const hasDot = metroNode.querySelector("beat-unit-dot") !== null;

    return perMinute * (hasDot ? factor * 1.5 : factor);
}

export function parseMetronome(metroNode: Element): number {
    const beatUnitNode = metroNode.querySelector("beat-unit");
    const perMinuteNode = metroNode.querySelector("per-minute");

    if (!beatUnitNode || !perMinuteNode) {
        return 0;
    }

    const beatUnit = beatUnitNode.textContent?.trim() || "";
    const perMinute = parseFloat(perMinuteNode.textContent || "0");

    return convertMetronomeToBpm(beatUnit, metroNode, perMinute);
}

function parseDirectionTempo(dir: Element): XmlMeasureEvent[] {
    const events: XmlMeasureEvent[] = [];

    const sound = dir.querySelector("sound[tempo]");
    if (sound) {
        const bpm = parseFloat(sound.getAttribute("tempo")!);
        events.push({ type: "tempo", bpm });
    }

    const metro = dir.querySelector("metronome");
    if (metro) {
        const bpm = parseMetronome(metro);
        events.push({ type: "tempo", bpm });
    }

    return events;
}

function parseDirectionJump(dir: Element): XmlJump | null {
    let jump: XmlJump | null = null;

    if (dir.querySelector("segno")) {
        jump = jump ?? {};
        jump.segno = true;
    }

    if (dir.querySelector("coda")) {
        jump = jump ?? {};
        jump.coda = true;
    }

    const words = dir.querySelector("words");
    if (words) {
        const text = words.textContent?.toLowerCase() ?? "";

        if (text.includes("d.s. al coda")) {
            jump = jump ?? {};
            jump.dsAlCoda = true;
        }

        if (text.includes("to coda")) {
            jump = jump ?? {};
            jump.toCoda = true;
        }

        if (text.includes("d.c. al fine")) {
            jump = jump ?? {};
            jump.dcAlFine = true;
        }

        if (text.includes("fine")) {
            jump = jump ?? {};
            jump.fine = true;
        }

        if (text.includes("d.s. al fine")) {
            jump = jump ?? {};
            jump.dsAlFine = true;
        }

        if (text.includes("d.c. al coda")) {
            jump = jump ?? {};
            jump.dcAlCoda = true;
        }
    }

    return jump;
}

function parseBarlineRepeatEnding(barline: Element) {
    let repeat: { direction: "forward" | "backward" } | null = null;
    let ending: { number: string; type: "start" | "stop" } | null = null;

    const repeatNode = barline.querySelector("repeat");
    if (repeatNode) {
        const dir = repeatNode.getAttribute("direction");
        if (dir === "forward" || dir === "backward") {
            repeat = { direction: dir };
        }
    }

    const endingNode = barline.querySelector("ending");
    if (endingNode) {
        const num = endingNode.getAttribute("number") || "";
        const type = endingNode.getAttribute("type") as "start" | "stop";
        if (type === "start" || type === "stop") {
            ending = { number: num, type };
        }
    }

    return { repeat, ending };
}

export function parseXmlMeasure(measureNode: Element): XmlMeasure {
    const number = measureNode.getAttribute("number") || "";

    const children = Array.from(measureNode.children);

    const events: XmlMeasureEvent[] = [];
    let repeat: { direction: "forward" | "backward" } | null = null;
    let ending: { number: string; type: "start" | "stop" } | null = null;
    let jump: XmlJump | null = null;

    for (const child of children) {
        const tag = child.tagName.toLowerCase();

        if (tag === "note") {
            events.push({ type: "note", note: parseXmlNote(child) });
        }

        else if (tag === "backup") {
            const durNode = child.querySelector("duration");
            const duration = durNode ? parseInt(durNode.textContent || "0", 10) : 0;
            events.push({ type: "backup", durationDiv: duration });
        }

        else if (tag === "forward") {
            const durNode = child.querySelector("duration");
            const duration = durNode ? parseInt(durNode.textContent || "0", 10) : 0;
            events.push({ type: "forward", durationDiv: duration });
        }

        else if (tag === "direction") {
            // tempo events
            events.push(...parseDirectionTempo(child));

            // jump markers
            const j = parseDirectionJump(child);
            if (j) jump = j;
        }

        else if (tag === "barline") {
            const info = parseBarlineRepeatEnding(child);
            if (info.repeat) repeat = info.repeat;
            if (info.ending) ending = info.ending;
        }
    }

    const attributesNode = measureNode.querySelector("attributes");

    const keyNode = attributesNode?.querySelector("key") || null;
    const key = keyNode ? parseXmlKey(keyNode) : null;
    const divisions = attributesNode ? parseXmlDivisions(attributesNode) : null;
    const barLines = parseXmlBarlines(measureNode);
    const dynamics = parseXmlDynamics(measureNode);
    const fermatas = parseXmlFermatas(measureNode);

    return {
        number,
        events,
        key,
        divisions,
        barLines,
        dynamics,
        fermatas,
        repeat,
        ending,
        jump
    };
}


export function parseXmlPart(partNode: Element): XmlPart {
    const id = partNode.getAttribute("id") || "";

    const measures: XmlMeasure[] = [];

    const measureNodes = Array.from(partNode.querySelectorAll("measure"));

    measureNodes.forEach(measure => {
            measures.push(parseXmlMeasure(measure));
    })

    return { id, measures };
}

export function LoadModel(xml: XmlDoc): XmlScore
{
    const model = new XmlScore();
    model.scoreParts = parseScoreParts(xml);

    // get the title
    const workNode = xml.querySelector("work > work-title");
    model.workTitle = workNode?.textContent ?? "";

    const parts: XmlPart[] = [];

    // load the parts
    model.scoreParts.forEach((scorePart: XmlScorePart) => {
        const id = scorePart.id;
        const partNode = xml.querySelector(`part[id="${id}"]`);
        if(partNode) {
            parts.push(parseXmlPart(partNode));
        }
    });

    model.parts = parts;
    return model;
}

function expandSimpleRepeats(measures: XmlMeasure[]): XmlMeasure[] {
    const expanded: XmlMeasure[] = [];

    // ⭐ Stack for nested repeats
    const repeatStack: number[] = [];

    // Track ending blocks: number → { start, end }
    const endingBlocks: Record<string, { start: number; end: number }> = {};

    // Pass 1: detect ending blocks
    let insideEnding = false;
    let currentEnding: string | null = null;

    for (let i = 0; i < measures.length; i++) {
        const m = measures[i];

        if (m.ending?.type === "start") {
            insideEnding = true;
            currentEnding = m.ending.number;
            endingBlocks[currentEnding] = { start: i, end: i };
        }

        if (insideEnding) {
            endingBlocks[currentEnding!].end = i;
        }

        if (m.ending?.type === "stop") {
            insideEnding = false;
            currentEnding = null;
        }
    }

    // Pass 2: build playback order
    for (let i = 0; i < measures.length; i++) {
        const m = measures[i];

        // ⭐ Forward repeat → push start index
        if (m.repeat?.direction === "forward") {
            repeatStack.push(expanded.length);
        }

        // Always include the measure itself
        expanded.push(m);

        // ⭐ Backward repeat → pop start index
        if (m.repeat?.direction === "backward") {

            // If no forward repeat, treat as repeat from start
            const startIndex = repeatStack.length > 0
                ? repeatStack.pop()!
                : 0;

            // Play all endings in numeric order
            const endingNumbers = Object.keys(endingBlocks)
                .sort((a, b) => Number(a) - Number(b));

            for (const num of endingNumbers) {
                const block = endingBlocks[num];
                for (let j = block.start; j <= block.end; j++) {
                    expanded.push(measures[j]);
                }
            }

            // Repeat main block
            const repeatBlock = expanded.slice(startIndex);
            expanded.push(...repeatBlock);
        }
    }

    return expanded;
}

function expandDSAlCoda(measures: XmlMeasure[]): XmlMeasure[] {
    let segnoIndex = -1;
    let codaIndex = -1;
    let dsIndex = -1;
    let toCodaIndex = -1;

    for (let i = 0; i < measures.length; i++) {
        const j = measures[i].jump;
        if (!j) continue;

        if (j.segno) segnoIndex = i;
        if (j.coda) codaIndex = i;
        if (j.dsAlCoda) dsIndex = i;
        if (j.toCoda) toCodaIndex = i;
    }

    // If any required marker is missing, return unchanged
    if (dsIndex < 0 || segnoIndex < 0 || toCodaIndex < 0 || codaIndex < 0) {
        return measures;
    }

    const A = measures.slice(0, dsIndex + 1);
    const B = measures.slice(segnoIndex, toCodaIndex + 1);
    const C = measures.slice(codaIndex);

    return [...A, ...B, ...C];
}

function expandDSAlFine(measures: XmlMeasure[]): XmlMeasure[] {
    let segnoIndex = -1;
    let dsIndex = -1;
    let fineIndex = -1;

    for (let i = 0; i < measures.length; i++) {
        const j = measures[i].jump;
        if (!j) continue;

        if (j.segno) segnoIndex = i;
        if (j.dsAlFine) dsIndex = i;
        if (j.fine) fineIndex = i;
    }

    if (segnoIndex < 0 || dsIndex < 0 || fineIndex < 0) {
        return measures;
    }

    const A = measures.slice(0, dsIndex + 1);
    const B = measures.slice(segnoIndex, fineIndex + 1);

    return [...A, ...B];
}

function expandDCAlFine(measures: XmlMeasure[]): XmlMeasure[] {
    let dcIndex = -1;
    let fineIndex = -1;

    for (let i = 0; i < measures.length; i++) {
        const j = measures[i].jump;
        if (!j) continue;

        if (j.dcAlFine) dcIndex = i;
        if (j.fine) fineIndex = i;
    }

    // If no D.C. al Fine markers, return unchanged
    if (dcIndex < 0 || fineIndex < 0) {
        return measures;
    }

    const A = measures.slice(0, dcIndex + 1);
    const B = measures.slice(0, fineIndex + 1);

    return [...A, ...B];
}

function expandDCAlCoda(measures: XmlMeasure[]): XmlMeasure[] {
    let dcIndex = -1;
    let toCodaIndex = -1;
    let codaIndex = -1;

    for (let i = 0; i < measures.length; i++) {
        const j = measures[i].jump;
        if (!j) continue;

        if (j.dcAlCoda) dcIndex = i;
        if (j.toCoda) toCodaIndex = i;
        if (j.coda) codaIndex = i;
    }

    if (dcIndex < 0 || toCodaIndex < 0 || codaIndex < 0) {
        return measures;
    }

    const A = measures.slice(0, dcIndex + 1);
    const B = measures.slice(0, toCodaIndex + 1);
    const C = measures.slice(codaIndex);

    return [...A, ...B, ...C];
}

export function expandScoreRepeats(score: XmlScore): XmlScore {
    const first = score.parts[0];

    // Expand repeats ONLY for the first part
    const expandedFirst = expandSimpleRepeats(first.measures);
    const expandedFirst2 = expandDSAlCoda(expandedFirst);
    const expandedFirst3 = expandDCAlFine(expandedFirst2);
    const expandedFirst4 = expandDSAlFine(expandedFirst3);
    const expandedFirst5 = expandDCAlCoda(expandedFirst4);

    const expandedParts: XmlPart[] = [];

    for (const part of score.parts) {
        const newMeasures: XmlMeasure[] = [];

        for (let i = 0; i < expandedFirst5.length; i++) {
            // If part has fewer measures, reuse last measure
            const src = part.measures[i] ?? part.measures[part.measures.length - 1];
            newMeasures.push(src);
        }

        expandedParts.push({ ...part, measures: newMeasures });
    }

    return { ...score, parts: expandedParts };
}


export function expandRepeats(score: XmlScore): XmlScore {
    const expandedParts: XmlPart[] = [];

    for (const part of score.parts) {
        let measures = part.measures;

        measures = expandSimpleRepeats(measures);
        measures = expandDSAlCoda(measures);
        measures = expandDCAlFine(measures);
        measures = expandDSAlFine(measures);
        measures = expandDCAlCoda(measures);

        expandedParts.push({
            ...part,
            measures
        });
    }

    return {
        ...score,
        parts: expandedParts
    };
}

