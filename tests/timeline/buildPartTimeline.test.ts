import { describe, it, expect, beforeEach } from "vitest";
import { loadScoreFixture } from "../utils/helpers";
import {getParts, type XmlScorePartwise} from "../../src/fastXml/helpers";
import { buildPartTimeline } from "../../src/fastXml/timeline";


describe("buildPartTimeline", () => {
    const PPQ = 480;

    it("produces a global timeline for Old Macdonald including barlines and beats", () => {
        const score = loadScoreFixture("OldMacdonaldOut.musicxml");
        const parts = getParts(score);

        const part = parts[0];
        const timeline = buildPartTimeline(part, PPQ);

        expect(timeline.length).toBeGreaterThan(0);

        let barlineCount = 0;
        let beatCount = 0;

        for (const ev of timeline) {
            if ("note" in ev) {
                console.log("Note: tick ",ev.tick,"pitch",ev.note.pitch, "duration",ev.note.duration);
                expect(ev.note).toBeDefined();
            }
            if ("bpm" in ev) {
                console.log("Tempo: tick ",ev.tick,"bpm",ev.bpm);
                expect(typeof ev.bpm).toBe("number");
            }
            if ("barline" in ev) {
                console.log("bar: tick ",ev.tick,"measure",ev.measureNumber);
                barlineCount++;
                expect(typeof ev.measureNumber).toBe("number");
            }
            if ("beat" in ev) {
                console.log("Beat: tick ",ev.tick,"beat",ev.beat);
                beatCount++;
                expect(typeof ev.beatNumber).toBe("number");
            }
        }

        expect(barlineCount).toBe(4);
        expect(beatCount).toBe(16);
    });
});

