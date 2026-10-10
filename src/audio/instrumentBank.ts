import {type XmlScorePart} from "../fastXml/helpers";
import Soundfont, {type InstrumentName} from "soundfont-player";

// const GM_INSTRUMENT_MAP: Record<string, InstrumentName> = {
//     piano: "acoustic_grand_piano",
//     grand: "acoustic_grand_piano",
//     violin: "violin",
//     viola: "viola",
//     cello: "cello",
//     flute: "flute",
//     piccolo: "piccolo",
//     oboe: "oboe",
//     clarinet: "clarinet",
//     bassoon: "bassoon",
//     trumpet: "trumpet",
//     trombone: "trombone",
//     tuba: "tuba",
//     horn: "french_horn",
//     sax: "alto_sax",
//     choir: "choir_aahs",
//     voice: "choir_aahs",
//     guitar: "acoustic_guitar_nylon",
//     bass: "acoustic_bass",
//     organ: "drawbar_organ",
//     harp: "orchestral_harp",
//     bells: "tubular_bells",
// };

// export function resolveInstrumentName(part: XmlScorePart): InstrumentName {
//     const scoreInstr = getPrimaryScoreInstrument(part);
//     const midiInstr = getPrimaryMidiInstrument(part);
//
//     // 1. instrument-name
//     const instrName = scoreInstr?.["instrument-name"]?.toLowerCase();
//     if (instrName) {
//         for (const key of Object.keys(GM_INSTRUMENT_MAP)) {
//             if (instrName.includes(key)) {
//                 return GM_INSTRUMENT_MAP[key];
//             }
//         }
//     }
//
//     // 2. instrument-sound
//     const instrSound = midiInstr?.["instrument-sound"]?.toLowerCase();
//     if (instrSound) {
//         for (const key of Object.keys(GM_INSTRUMENT_MAP)) {
//             if (instrSound.includes(key)) {
//                 return GM_INSTRUMENT_MAP[key];
//             }
//         }
//     }
//
//     // 3. part-name
//     const partName = part["part-name"]?.toLowerCase();
//     if (partName) {
//         for (const key of Object.keys(GM_INSTRUMENT_MAP)) {
//             if (partName.includes(key)) {
//                 return GM_INSTRUMENT_MAP[key];
//             }
//         }
//     }
//
//     // 4. midi-program
//     const program = midiInstr?.["midi-program"];
//     if (program != null) {
//         if (program >= 0 && program <= 7) return "acoustic_grand_piano";
//         if (program >= 40 && program <= 47) return "violin";
//         if (program >= 73 && program <= 79) return "flute";
//         if (program >= 52 && program <= 55) return "choir_aahs";
//     }
//
//     // 5. fallback
//     return "acoustic_grand_piano";
// }

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function resolveInstrumentName(part: XmlScorePart): InstrumentName {

    // I've decided to play everything as a piano note
    return "acoustic_grand_piano";
}

export interface ISoundFontInstrument {
    out: GainNode;

    play(
        note: number | string,
        when?: number,
        options?: {
            duration?: number;
            gain?: number;
        }
    ): void;

    stop(when?: number, ids?: number[]): void;

    // These exist on the real Player type
    context: AudioContext;
    buffers: Record<number, AudioBuffer>;
    schedule(time: number, events: Array<unknown>): void;
    start(
        note: number | string,
        when?: number,
        options?: {
            duration?: number;
            gain?: number;
        }
    ): void;
}

export class InstrumentBank {
    private defaultInst: ISoundFontInstrument | null = null;

    async loadDefaultInstrument(ac:AudioContext | null): Promise<void> {

        if(!ac) return;
        if(this.defaultInst != null) return;

        const raw = await Soundfont.instrument(ac, "acoustic_grand_piano");
        const inst = raw as unknown as ISoundFontInstrument;

        const gain = ac.createGain();
        const pan = ac.createStereoPanner();

        inst.out.connect(gain);
        gain.connect(pan);
        pan.connect(ac.destination);

        this.defaultInst = inst;
    }

    async loadInstrumentForPart(ac:AudioContext | null,
        gmName: InstrumentName
    ): Promise<{ inst: ISoundFontInstrument; gain: GainNode; pan: StereoPannerNode } | undefined> {

        if(!ac) return undefined;

        const raw = await Soundfont.instrument(ac, gmName);
        const inst = raw as unknown as ISoundFontInstrument;

        const gain = ac.createGain();
        const pan = ac.createStereoPanner();

        // ⭐ IMPORTANT: remove default routing
        inst.out.disconnect();

        inst.out.connect(gain);
        gain.connect(pan);
        pan.connect(ac.destination);

        return { inst, gain, pan };
    }

    getDefaultInstrument()  :ISoundFontInstrument | null {
        return this.defaultInst;
    }
}