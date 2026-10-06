// add code here to fins out why the beats are exploding
import { describe, it, expect } from "vitest";
import {loadScoreFixture} from "../utils/helpers";
import {getMeasures, getParts} from "../../src/fastXml/helpers";
import {
    buildScorePlaybackEvents,
    isPlaybackNote, PPQ
} from "../../src/fastXml/playback";

describe("validation tests", () => {
    it("do all parts have the same number of measures Chan_Mali_Chan.musicxml", () => {
        const score = loadScoreFixture("Chan_Mali_Chan.musicxml");
        const parts = getParts(score);

        expect(parts.length).toBe(4);

        let firstPart:boolean = true;
        let firstMeasures = 0;

        for (const part of parts) {
            const measures = getMeasures(part);

            if(firstPart)
            {
                firstPart = false;
                firstMeasures = measures.length;
            }
            else
            {
                expect(measures.length).toBe(firstMeasures);
            }
        }
    });
    it("do all parts have the same total length Chan_Mali_Chan.musicxml", () => {
        const score = loadScoreFixture("Chan_Mali_Chan.musicxml");
        const parts = getParts(score);

        expect(parts.length).toBe(4);

        const playback = buildScorePlaybackEvents(score, PPQ);

        let firstPart:boolean = true;
        let firstPartMaxSeconds:number = 0;
        let partIndex: number = 0;

        for (const part of playback) {
            let maxSeconds:number = 0;
            for (const ev of part) {
                if (isPlaybackNote(ev)) {
                    const raw = ev.durationSeconds;
                    const duration = typeof raw === "number" ? raw : 0;
                    const end = ev.timeSeconds + duration;

                    if (end > maxSeconds) {
                        maxSeconds = end;
                    }
                }
            }

            console.log("part: ", partIndex, "length (seconds)", maxSeconds);

            if(firstPart)
            {
                firstPart = false;
                firstPartMaxSeconds = maxSeconds;
            }
            else
            {
                expect(maxSeconds).toBe(firstPartMaxSeconds);
            }
            partIndex++;
        }
    });
});