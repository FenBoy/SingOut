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
