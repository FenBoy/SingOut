import { describe, it, expect, beforeEach } from "vitest";
import { loadScoreFixture } from "../utils/helpers";
import {getParts, type XmlScorePartwise} from "../../src/fastXml/helpers";
import { buildPartTimeline } from "../../src/fastXml/timeline";


describe("buildPartTimeline2", () => {
    const PPQ = 480;

    it("produces a global timeline for Chan Mali Chan including barlines and beats", () => {
        const score = loadScoreFixture("Chan_Mali_Chan.musicxml");
        const parts = getParts(score);

        expect(parts.length).toBe(4);

        const part = parts[0];
        const timeline = buildPartTimeline(part, PPQ);

        expect(timeline.length).toBeGreaterThan(0);

        let barlineCount = 0;
        let beatCount = 0;

        for (const ev of timeline) {
            if ("note" in ev) {
                expect(ev.note).toBeDefined();
            }
            if ("bpm" in ev) {
                expect(typeof ev.bpm).toBe("number");
            }
            if ("barline" in ev) {
                barlineCount++;
                expect(typeof ev.measureNumber).toBe("number");
            }
            if ("beat" in ev) {
                beatCount++;
                expect(typeof ev.beatNumber).toBe("number");
            }
        }

        expect(barlineCount).toBeGreaterThan(0);
        expect(beatCount).toBeGreaterThan(0);
    });
});