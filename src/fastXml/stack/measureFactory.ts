import {
    getEffectiveDuration,
    getMeasureEvents,
    normalizeVoice,
    type XmlMeasure
} from "../helpers";
import {PartState} from "./partFactory";
import type {TimelineMeasure} from "../timeline";

export class MeasureState {

    currentVoice:number;
    voiceCursor: Map<number, number>;

    constructor() {
        this.currentVoice = 1;
        this.voiceCursor = new Map();
        this.voiceCursor.set(1,0);
    }

    // we need to start afresh for each part
    reset() {
        this.currentVoice = 1;
        this.voiceCursor = new Map();
        this.voiceCursor.set(1,0);
    }

    setCurrentVoice(voice:number) {
        this.currentVoice = voice;
        if(!this.voiceCursor.has(voice)){
            this.voiceCursor.set(voice,0);
        }
    }

    getCurrentCursor() : number
    {
        return this.getCursor(this.currentVoice);
    }

    setCurrentCursor(offset:number) {
        this.voiceCursor.set(this.currentVoice,offset);
    }

    moveCurrentCursor(offset:number) {
        this.setCurrentCursor(this.getCurrentCursor() + offset);
    }

    getCursor(voice: number): number {
        return this.voiceCursor.get(voice) ?? 0;
    }

    setCursor(voice:number, offset:number) {
        this.voiceCursor.set(voice,offset);
    }
}

export class MeasureFactory {

    ms: MeasureState = new MeasureState();

    constructor() {
    }

    // when we are starting a new part
    reset() {
        this.ms.reset();
    }

    process(measure:XmlMeasure, id: string, ps:PartState) : TimelineMeasure {
        const events = getMeasureEvents(measure);
        this.ms.reset();

        const tm: TimelineMeasure = {
            name: measure["@_number"],
            events: []
        };

        let pendingDurationQn:number = 0;

        for (const ev of events) {
            switch (ev.type) {
                case "note": {

                    const isChordTone = ev.note.chord !== undefined;
                    if(!isChordTone) {
                        // not a chord tone, we have moved on from the previous note
                        this.ms.moveCurrentCursor(pendingDurationQn);

                        // set the duration for the current note
                        pendingDurationQn = getEffectiveDuration(ev.note, ps.divisions);
                    }

                    this.ms.setCurrentVoice(normalizeVoice(ev.note.voice));
                    const cursor = this.ms.getCurrentCursor();
                    tm.events.push({ id: id, qnOffset: cursor, kind: "note", note: ev.note});

                    break;
                }

                case "backup": {
                    const raw = ev.backup.duration ?? 0;
                    const durQN = raw / ps.divisions;
                    this.ms.moveCurrentCursor(-durQN);
                    break;
                }

                case "forward": {
                    const raw = ev.forward.duration ?? 0;
                    const durQN = raw / ps.divisions;
                    this.ms.moveCurrentCursor(+durQN);
                    break;
                }

                case "direction": {
                    // directions belong to the current voice cursor
                    const cursor = this.ms.getCurrentCursor();

                    tm.events.push({
                        id,
                        qnOffset: cursor,
                        kind: "direction",
                        direction: ev.direction
                    });
                    break;
                }

                case "attributes": {
                    const cursor = this.ms.getCurrentCursor();

                    tm.events.push({
                        id,
                        qnOffset: cursor,
                        kind: "attributes",
                        attributes: ev.attributes
                    });

                    // Update the parts state when the divisions changes
                    if (typeof ev.attributes.divisions === "number") {
                        ps.setDivisions(ev.attributes.divisions);
                    }

                    break;
                }
            }
        }

        // sort into tick order
        tm.events.sort((a, b) => a.qnOffset - b.qnOffset);

        return tm;
    }
}