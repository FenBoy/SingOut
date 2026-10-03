import { describe, it, expect } from "vitest";
import {loadScoreFixture} from "../utils/helpers";
import {getMeasures, getParts} from "../../src/fastXml/helpers";
import {buildMeasureTimeline} from "../../src/fastXml/timeline";

describe("parse simple timelines", () => {
    it("creates a simple timeline for OldMacdonaldOut.musicxml", () => {
        const score = loadScoreFixture("OldMacdonaldOut.musicxml");
        const parts = getParts(score);
            const PPQ = 480;

            for (const part of parts) {
                const measures = getMeasures(part);

                for (const measure of measures) {
                    const timeline = buildMeasureTimeline(measure, PPQ);

                    expect(timeline.length).toBeGreaterThan(0);
                }
            }
    });
    it("creates a simple timeline for Chan_Mali_Chan.musicxml", () => {
        const score = loadScoreFixture("Chan_Mali_Chan.musicxml");
        const parts = getParts(score);

        expect(parts.length).toBe(4);

        const PPQ = 480;

        for (const part of parts) {
            const measures = getMeasures(part);

            for (const measure of measures) {
                const timeline = buildMeasureTimeline(measure, PPQ);

                expect(timeline.length).toBeGreaterThan(0);
            }
        }
    });
});