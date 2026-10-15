import {type XmlScorePart} from "./helpers";
import type {ISoundFontInstrument} from "../audio/InstrumentBank";

export interface AudioChannel {
    part: XmlScorePart;
    inst:ISoundFontInstrument;
    gain: GainNode;
    panNode: StereoPannerNode;
}
