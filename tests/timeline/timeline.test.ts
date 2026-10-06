import { describe, it, expect } from "vitest";
import {loadScoreFixture} from "../utils/helpers";
import {getMergedTimeline} from "../../src/fastXml/timeline";

describe("timeline tests", () => {
    it("construct a timeline for OldMacDonaldOut.musicxml", () => {
        const score = loadScoreFixture("OldMacdonaldOut.musicxml");
        const timeline = getMergedTimeline(score);

        // 'measures' is now the important 'unit' in our system
        // this file has 4 measures
        expect(timeline.length).toBe(4);
        console.log(timeline);

        // we expect the directions and attributes to appear as events in the timeline
        const meas0 = timeline[0];
        expect(meas0.events.length).toBe(6);

        // first the attributes
        const ev0 = meas0.events[0];
        console.log(ev0);
        expect("attributes" in ev0!).toBe(true);

        // then the direction
        const ev1 = meas0.events[1];
        console.log(ev1);
        expect("direction" in ev1!).toBe(true);

        // then the notes
        for (let index = 2; index < meas0.events.length; index++) {
            console.log(meas0.events[index]);
        }
    });
    it("construct a timeline for Chan_Mali_Chan.musicxml", () => {
        const score = loadScoreFixture("Chan_Mali_Chan.musicxml");
        const timeline = getMergedTimeline(score);

        // 'measures' is now the important 'unit' in our system
        // this file has 62 measures
        expect(timeline.length).toBe(62);
        console.log(timeline);
    });
    it("construct a timeline for Handerna.musicxml", () => {
        const score = loadScoreFixture("Handerna.musicxml");
        const timeline = getMergedTimeline(score);

        // 'measures' is now the important 'unit' in our system
        // this file has 138
        expect(timeline.length).toBe(138);
        console.log(timeline);
    });
});