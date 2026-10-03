import {getPartList, type XmlScorePart, type XmlScorePartwise} from "./helpers";

export interface AudioChannel {
    index: number;
    muted : boolean;
    volume: number;
    pan: number;
    part: XmlScorePart;
}

export function buildChannels(parts: XmlScorePart[]): AudioChannel[] {
    return parts.map((part, i) => ({
        index: i,
        muted: false,
        volume: 1,
        pan: 0,
        part
    }));
}

export function buildScoreChannels(score:XmlScorePartwise | null): AudioChannel[] {
    if(score==null) return [];
    return buildChannels(getPartList(score));
}
