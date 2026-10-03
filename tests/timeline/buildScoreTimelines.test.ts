import { describe, it, expect } from "vitest";
import {loadScoreFixture} from "../utils/helpers";
import {getParts} from "../../src/fastXml/helpers";
import {buildPartTimeline, buildScoreTimelines} from "../../src/fastXml/timeline";

describe("buildScoreTimelines", () => {
    const PPQ = 480;

    it("produces the timelines for Old Macdonald", () => {
        const score = loadScoreFixture("OldMacdonaldOut.musicxml");
        const PPQ = 480;
        const timelines = buildScoreTimelines(score, PPQ);
    });

    it("produces a global timeline for Chan Mali Chan", () => {
        const score = loadScoreFixture("Chan_Mali_Chan.musicxml");
        const PPQ = 480;
        const timelines = buildScoreTimelines(score, PPQ);
    });
});