import { describe, it, expect } from "vitest";
import {loadScoreFixture} from "../utils/helpers";
import {getMeasures, getParts} from "../../src/fastXml/helpers";
import {buildMeasureTimeline} from "../../src/fastXml/timeline";


describe("buildMeasureTimeline", () => {
    const PPQ = 480;

    it("produces note and tempo events with local ticks for OldMacdonald", () => {
        const score = loadScoreFixture("OldMacdonaldOut.musicxml");
        const parts = getParts(score);
        const part = parts[0];
        const measure = getMeasures(part)[0];

        const timeline = buildMeasureTimeline(measure, PPQ);

        expect(timeline.length).toBeGreaterThan(0);

        for (const ev of timeline) {
            expect(typeof ev.tick).toBe("number");

            if ("note" in ev) {
                expect(ev.note).toBeDefined();
            }

            if ("bpm" in ev) {
                expect(typeof ev.bpm).toBe("number");
            }
        }
    });
    it("produces note and tempo events with local ticks for Chan Mali Chan", () => {
        const score = loadScoreFixture("Chan_Mali_Chan.musicxml");
        const parts = getParts(score);
        const part = parts[0];
        const measure = getMeasures(part)[0];

        const timeline = buildMeasureTimeline(measure, PPQ);

        expect(timeline.length).toBeGreaterThan(0);

        for (const ev of timeline) {
            expect(typeof ev.tick).toBe("number");

            if ("note" in ev) {
                expect(ev.note).toBeDefined();
            }

            if ("bpm" in ev) {
                expect(typeof ev.bpm).toBe("number");
            }
        }
    });
});
