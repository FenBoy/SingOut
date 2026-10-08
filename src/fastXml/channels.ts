import {type XmlScorePart} from "./helpers";
import type {ISoundFontInstrument} from "../audio/instrumentBank";

export interface AudioChannel {
    part: XmlScorePart;
    inst:ISoundFontInstrument;
    gain: GainNode;
    panNode: StereoPannerNode;
}
