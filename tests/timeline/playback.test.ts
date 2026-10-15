import { describe, it, expect } from "vitest";
import {loadScoreFixture} from "../utils/helpers";
import {
    getPlaybackScoreLengthSeconds,
} from "../../src/fastXml/playback";
import {TimelineFactory} from "../../src/fastXml/stack/timelineFactory";
import {PlaybackFactory} from "../../src/fastXml/stack/playbackFactory";
import {logTimelineEvent} from "../../src/fastXml/debug/logging";

describe("playback tests", () => {
    it("factory approach for OldMacDonaldOut.musicxml", () => {
        const score = loadScoreFixture("OldMacdonaldOut.musicxml");

        const tf:TimelineFactory = new TimelineFactory();
        const timeline = tf.process(score);

        timeline.forEach(t => {
            console.log(t);
        })

        const pf:PlaybackFactory = new PlaybackFactory();
        const playback = pf.process(timeline);

        // 4 bars of 4 quarter notes at 120 bpm
        // 16 beats at 2 beats per seconds = 8 seconds
        const length = getPlaybackScoreLengthSeconds(playback);
        expect(length).toBe(8);

        expect(playback).toBeDefined();
        // console.log("---------------------Old Macdonald");
        // console.log(playback);
    });
    it("construct a playback for FastMacDonald.musicxml", () => {
        const score = loadScoreFixture("FastMacdonald.musicxml");
        const tf:TimelineFactory = new TimelineFactory();
        const timeline = tf.process(score);
        const pf:PlaybackFactory = new PlaybackFactory();
        const playback = pf.process(timeline);

        // 4 bars of 4 quarter notes at 240 bpm
        // 16 beats at 2 beats per seconds = 4 seconds
        const length = getPlaybackScoreLengthSeconds(playback);
        expect(length).toBe(4);

        expect(playback).toBeDefined();
        // console.log(playback);
    });
    it("validate playback for Handerna.musicxml", () => {
        const score = loadScoreFixture("Handerna.musicxml");

        const tf:TimelineFactory = new TimelineFactory();
        const timeline = tf.process(score);

        const pf:PlaybackFactory = new PlaybackFactory();
        const playback = pf.process(timeline);

        let lastTime =  0;
        for(let i = 0; i < playback.length; i++)
        {
            expect(playback[i].timeSeconds).toBeGreaterThanOrEqual(lastTime);
            lastTime = playback[i].timeSeconds;
        }
    });
    it("validate playback for HandernaTest2.musicxml", () => {
        const score = loadScoreFixture("HandernaTest2.musicxml");

        const tf:TimelineFactory = new TimelineFactory();
        const timeline = tf.process(score);

        const pf:PlaybackFactory = new PlaybackFactory();
        const playback = pf.process(timeline);

        let lastTime =  0;
        for(let i = 0; i < playback.length; i++)
        {
            expect(playback[i].timeSeconds).toBeGreaterThanOrEqual(lastTime);
            lastTime = playback[i].timeSeconds;
        }
    });
    it("validate playback for ChanTest.musicxml", () => {
        const score = loadScoreFixture("ChanTest.musicxml");

        const tf:TimelineFactory = new TimelineFactory();
        const timeline = tf.process(score);

        for(let i = 0; i < timeline.length; i++)
        {
            console.log("measure: ", i, timeline[i].name)
            const measure = timeline[i];
            measure.events.forEach(e => logTimelineEvent(e));
        }

        const pf:PlaybackFactory = new PlaybackFactory();
        const playback = pf.process(timeline);

        let lastTime =  0;
        for(let i = 0; i < playback.length; i++)
        {
            console.log(playback[i]);
            expect(playback[i].timeSeconds).toBeGreaterThanOrEqual(lastTime);
            lastTime = playback[i].timeSeconds;
        }
    });
});