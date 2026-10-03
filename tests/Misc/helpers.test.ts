import { describe, it, expect, beforeAll } from "vitest";
import {loadScoreFixture} from "../utils/helpers";

import {
    getPartIndexFromScore,
    normalizeScorePartList,
    type XmlScorePartwise
} from "../../src/fastXml/helpers";

describe("helpers", () => {
    let score: XmlScorePartwise;

    beforeAll(() => {
        score = loadScoreFixture("Handerna.musicxml");
    });

    it("part selection works", () => {
        const partList = normalizeScorePartList(score);
        expect(partList.length).toBeGreaterThan(0);

        partList.forEach((part, index) => {
            const foundIndex = getPartIndexFromScore(score, part);
            expect(foundIndex).toBe(index);
            console.log("found part index", index);
        });
    });
});