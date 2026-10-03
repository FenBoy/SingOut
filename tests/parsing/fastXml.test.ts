import { describe, it, expect } from "vitest";
import {
    getTitle,
    getPartList,
    getParts,
    getMeasures, type XmlScorePart, type XmlPart, getMeasureEvents, getLyricText
} from "../../src/fastXml/helpers";
import {loadScoreFixture} from "../utils/helpers";

describe("fast-xml-parser", () => {
    it("loads and parses OldMacdonaldOut.musicxml", () => {
        const score = loadScoreFixture("OldMacdonaldOut.musicxml");
        expect(score).toBeDefined();

        // Log the structure so you can inspect it manually
        console.log(JSON.stringify(score, null, 2));

        // get title
        const title : string = getTitle(score);
        expect(title).toBe("");

        // get parts list (descriptions)
        const partList:XmlScorePart[] = getPartList(score);
        expect(partList.length).toBe(1);

        // get the parts
        const parts: XmlPart[] = getParts(score);
        expect(parts.length).toBe(1);

        let partIndex:number = 0;
        for (const part of parts) {
            const measures = getMeasures(part);

            expect(measures.length).toBeGreaterThan(0);

            if(partIndex == 0)
            {
                expect(measures.length).toBe(4);
            }

            for (const measure of measures) {
                // events
                const events = getMeasureEvents(measure);
                for (const ev of events) {
                    switch (ev.type) {
                        case "note":
                            // ev.note is fully typed as XmlNote
                            console.log("NOTE duration:", ev.note.duration);
                            console.log("NOTE pitch:", ev.note.pitch?.step);
                            console.log("NOTE lyric", getLyricText(ev.note));
                            break;

                        case "backup":
                            // ev.backup is typed as unknown (you can refine later)
                            console.log("BACKUP event");
                            break;

                        case "forward":
                            console.log("FORWARD event");
                            break;

                        case "direction":
                            console.log("DIRECTION event");
                            break;

                        case "barline":
                            console.log("BARLINE event");
                            break;
                    }
                }
            }

            partIndex++;
        }
    });
    it("loads and parses Chan_Mali_Chan.musicxml", () => {
        const score = loadScoreFixture("Chan_Mali_Chan.musicxml");
        expect(score).toBeDefined();

        // Log the structure so you can inspect it manually
        console.log(JSON.stringify(score, null, 2));

        // get title
        const title : string = getTitle(score);
        expect(title).toBe("Chan Mali Chan");

        // get parts list (descriptions)
        const partList:XmlScorePart[] = getPartList(score);
        expect(partList.length).toBe(4);

        // get the parts (4 parts)
        const parts: XmlPart[] = getParts(score);
        expect(parts.length).toBe(4);

        let partIndex:number = 0;
        for (const part of parts) {
            const measures = getMeasures(part);

            expect(measures.length).toBeGreaterThan(0);

            if(partIndex == 0)
            {
                // Chan Mali Chan has 62 measures
                expect(measures.length).toBe(62);
            }

            for (const measure of measures) {
                // events
                const events = getMeasureEvents(measure);
                for (const ev of events) {
                    switch (ev.type) {
                        case "note":
                            // ev.note is fully typed as XmlNote
                            console.log("NOTE duration:", ev.note.duration);
                            console.log("NOTE pitch:", ev.note.pitch?.step);
                            console.log("NOTE lyric", getLyricText(ev.note));
                            break;

                        case "backup":
                            // ev.backup is typed as unknown (you can refine later)
                            console.log("BACKUP event");
                            break;

                        case "forward":
                            console.log("FORWARD event");
                            break;

                        case "direction":
                            console.log("DIRECTION event");
                            break;

                        case "barline":
                            console.log("BARLINE event");
                            break;
                    }
                }
            }

            partIndex++;
        }
    });
});
