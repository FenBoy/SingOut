import { describe, it, expect } from "vitest";
import {loadScoreFixture} from "../utils/helpers";
import {getMergedTimeline} from "../../src/fastXml/timeline";
import {getPlayback, getPlaybackScoreLengthSeconds} from "../../src/fastXml/playback";

describe("playback tests", () => {
    it("construct a playback for OldMacDonaldOut.musicxml", () => {
        const score = loadScoreFixture("OldMacdonaldOut.musicxml");
        const timeline = getMergedTimeline(score);
        const playback = getPlayback(timeline);

        // 4 bars of 4 quarter notes at 120 bpm
        // 16 beats at 2 beats per seconds = 8 seconds
        const length = getPlaybackScoreLengthSeconds(playback);
        expect(length).toBe(8);

        expect(playback).toBeDefined();
        console.log(playback);
    });
});