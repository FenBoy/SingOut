import { describe, it, expect } from "vitest";
import {loadScoreFixture} from "../utils/helpers";
import {TimelineFactory} from "../../src/fastXml/stack/timelineFactory";
import {PlaybackFactory} from "../../src/fastXml/stack/playbackFactory";

describe("playback tests", () => {
    it("step thru ChanTest.musicxml", () => {
        const score = loadScoreFixture("ChanTest.musicxml");

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
});