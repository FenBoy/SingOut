import type {
    ScoreModel,
    MeasureModel,
    KeyChange,
    TempoChange,
    TimeSignature,
    XmlNote,
    XmlLyric
} from "./Types";

export function parseMusicXml(xml: Document): ScoreModel {
    const score: ScoreModel = {
        measures: [],
        keyChanges: [],
        tempoChanges: [],
        timeSignatures: [],
        notes: [],
        lyrics: []
    };

    const partNodes = Array.from(xml.getElementsByTagName("part"));
    if (partNodes.length === 0) return score;

    // Parse ALL parts
    partNodes.forEach((partNode, partIndex) => {
        parsePart(partNode, partIndex, score);
    });

    // Global timing pass
    computeTiming(score);

    return score;
}

/* -----------------------------
   PART PARSING
   ----------------------------- */

function parsePart(partNode: Element, partIndex: number, score: ScoreModel) {
    const measureNodes = Array.from(partNode.getElementsByTagName("measure"));

    let currentDivisions = 1;
    const voiceTime: Record<number, number> = {};

    measureNodes.forEach((measureNode, measureIndex) => {
        const measure: MeasureModel = {
            index: measureIndex,
            startTime: 0,
            duration: 0,
            divisions: currentDivisions,
            partIndex
        };
        score.measures.push(measure);

        const attributes = measureNode.getElementsByTagName("attributes")[0];
        if (attributes) {
            const divisionsNode = attributes.getElementsByTagName("divisions")[0];
            if (divisionsNode) {
                currentDivisions = parseInt(divisionsNode.textContent || "1", 10);
                measure.divisions = currentDivisions;
            }

            parseKey(attributes, measureIndex, score);
            parseTimeSignature(attributes, measureIndex, score);
        }

        parseTempo(measureNode, measureIndex, score);

        // Reset voice cursors for this measure
        for (const v in voiceTime) voiceTime[v] = 0;

        const children = Array.from(measureNode.childNodes);

        // Process measure children in order: notes, forward, backup
        for (const child of children) {
            if (!(child instanceof Element)) continue;

            if (child.tagName === "note") {
                parseNote(child, measureIndex, partIndex, score, voiceTime);
            }

            if (child.tagName === "forward") {
                const durNode = child.getElementsByTagName("duration")[0];
                if (durNode) {
                    const dur = parseInt(durNode.textContent || "0", 10);
                    for (const v in voiceTime) {
                        voiceTime[v] += dur;
                    }
                }
            }

            if (child.tagName === "backup") {
                const durNode = child.getElementsByTagName("duration")[0];
                if (durNode) {
                    const dur = parseInt(durNode.textContent || "0", 10);
                    for (const v in voiceTime) {
                        voiceTime[v] -= dur;
                        if (voiceTime[v] < 0) voiceTime[v] = 0;
                    }
                }
            }
        }
    });
}

/* -----------------------------
   ATTRIBUTE PARSERS
   ----------------------------- */

function parseKey(attributes: Element, measureIndex: number, score: ScoreModel) {
    const key = attributes.getElementsByTagName("key")[0];
    if (!key) return;

    const fifthsNode = key.getElementsByTagName("fifths")[0];
    const modeNode = key.getElementsByTagName("mode")[0];

    const fifths = fifthsNode ? parseInt(fifthsNode.textContent || "0", 10) : 0;
    const mode = modeNode ? modeNode.textContent || "major" : "major";

    const keyChange: KeyChange = {
        measureIndex,
        fifths,
        mode
    };

    score.keyChanges.push(keyChange);
}

function parseTimeSignature(attributes: Element, measureIndex: number, score: ScoreModel) {
    const time = attributes.getElementsByTagName("time")[0];
    if (!time) return;

    const beatsNode = time.getElementsByTagName("beats")[0];
    const beatTypeNode = time.getElementsByTagName("beat-type")[0];

    if (!beatsNode || !beatTypeNode) return;

    const ts: TimeSignature = {
        measureIndex,
        beats: parseInt(beatsNode.textContent || "4", 10),
        beatType: parseInt(beatTypeNode.textContent || "4", 10)
    };

    score.timeSignatures.push(ts);
}

/* -----------------------------
   TEMPO PARSER
   ----------------------------- */

function parseTempo(measureNode: Element, measureIndex: number, score: ScoreModel) {
    // <sound tempo="120">
    const sound = measureNode.getElementsByTagName("sound")[0];
    if (sound && sound.hasAttribute("tempo")) {
        const bpm = parseFloat(sound.getAttribute("tempo") || "0");
        const tempoChange: TempoChange = {
            timeSeconds: measureIndex,   // temporarily store measure index
            bpm
        };
        score.tempoChanges.push(tempoChange);
    }

    // <metronome><per-minute>120</per-minute>
    const metronome = measureNode.getElementsByTagName("metronome")[0];
    if (metronome) {
        const perMinute = metronome.getElementsByTagName("per-minute")[0];
        if (perMinute) {
            const bpm = parseFloat(perMinute.textContent || "0");
            const tempoChange: TempoChange = {
                timeSeconds: measureIndex,
                bpm
            };
            score.tempoChanges.push(tempoChange);
        }
    }
}

/* -----------------------------
   NOTE PARSER
   ----------------------------- */

function parseNote(
    noteNode: Element,
    measureIndex: number,
    partIndex: number,
    score: ScoreModel,
    voiceTime: Record<number, number>
) {
    const restNode = noteNode.getElementsByTagName("rest")[0];
    const chordNode = noteNode.getElementsByTagName("chord")[0];
    const graceNode = noteNode.getElementsByTagName("grace")[0];

    const pitchNode = noteNode.getElementsByTagName("pitch")[0];
    let midiPitch = 60;

    // ⭐ Skip rests completely
    if (restNode) {
        return;
    }

    if (pitchNode) {
        const step = pitchNode.getElementsByTagName("step")[0]?.textContent || "C";
        const octave = parseInt(
            pitchNode.getElementsByTagName("octave")[0]?.textContent || "4",
            10
        );
        const alter = parseInt(
            pitchNode.getElementsByTagName("alter")[0]?.textContent || "0",
            10
        );

        midiPitch = convertPitch(step, octave, alter);
    }

    const durationNode = noteNode.getElementsByTagName("duration")[0];
    const durationDivisions = durationNode
        ? parseInt(durationNode.textContent || "0", 10)
        : 0;

    const voiceNode = noteNode.getElementsByTagName("voice")[0];
    const voice = voiceNode ? parseInt(voiceNode.textContent || "1", 10) : 1;

    if (!(voice in voiceTime)) voiceTime[voice] = 0;

    let startDivisions = voiceTime[voice];

    if (chordNode) {
        // same start time as previous note in this voice
    } else if (!graceNode && !restNode) {
        // normal note: advance cursor after note
        voiceTime[voice] += durationDivisions;
    }

    const lyricNode = noteNode.getElementsByTagName("lyric")[0];
    const lyricText =
        lyricNode?.getElementsByTagName("text")[0]?.textContent || undefined;

    const xmlNote: XmlNote = {
        pitch: midiPitch,
        startTime: 0,
        duration: 0,
        voice,
        measureIndex,
        partIndex,
        lyric: lyricText,
        startDivisions,
        durationDivisions
    };

    score.notes.push(xmlNote);

    if (lyricText) {
        const xmlLyric: XmlLyric = {
            text: lyricText,
            noteIndex: score.notes.length - 1,
            measureIndex,
            partIndex
        };
        score.lyrics.push(xmlLyric);
    }
}

/* -----------------------------
   PITCH CONVERSION
   ----------------------------- */

function convertPitch(step: string, octave: number, alter: number): number {
    const stepMap: Record<string, number> = {
        C: 0,
        D: 2,
        E: 4,
        F: 5,
        G: 7,
        A: 9,
        B: 11
    };

    return (octave + 1) * 12 + stepMap[step] + alter;
}

/* -----------------------------
   GLOBAL TIMING
   ----------------------------- */

function computeTiming(score: ScoreModel) {
    // Default tempo
    let currentBpm = score.tempoChanges.length > 0
        ? score.tempoChanges[0].bpm
        : 120;

    // Tempo indexed by measure index (we stored measureIndex in timeSeconds)
    const tempoByMeasure = new Map<number, number>();
    score.tempoChanges.forEach(tc => {
        const mIndex = Math.round(tc.timeSeconds);
        tempoByMeasure.set(mIndex, tc.bpm);
    });

    let currentTime = 0;

    // Use partIndex === 0 as master timeline
    const masterMeasures = score.measures
        .filter(m => m.partIndex === 0)
        .sort((a, b) => a.index - b.index);

    // MASTER MEASURE TIMING
    for (const measure of masterMeasures) {
        if (tempoByMeasure.has(measure.index)) {
            currentBpm = tempoByMeasure.get(measure.index)!;
        }

        const secPerQuarter = 60 / currentBpm;
        const secPerDivision = secPerQuarter / measure.divisions;

        let maxDivisions = 0;

        const notesInMeasure = score.notes.filter(
            n => n.measureIndex === measure.index
        );

        for (const note of notesInMeasure) {
            const startSec = currentTime + note.startDivisions * secPerDivision;
            const durSec = note.durationDivisions * secPerDivision;

            note.startTime = startSec;
            note.duration = durSec;

            const endDiv = note.startDivisions + note.durationDivisions;
            if (endDiv > maxDivisions) maxDivisions = endDiv;
        }

        measure.startTime = currentTime;
        measure.duration = maxDivisions * secPerDivision;

        currentTime += measure.duration;
    }

    // PROPAGATE TIMING TO OTHER PARTS
    const otherMeasures = score.measures.filter(m => m.partIndex !== 0);
    for (const m of otherMeasures) {
        const master = masterMeasures.find(mm => mm.index === m.index);
        if (master) {
            m.startTime = master.startTime;
            m.duration = master.duration;
        }
    }

    // SET TEMPO CHANGE ABSOLUTE TIMES
    for (const tc of score.tempoChanges) {
        const master = masterMeasures.find(
            mm => mm.index === Math.round(tc.timeSeconds)
        );
        if (master) {
            tc.timeSeconds = master.startTime;
        }
    }
}


