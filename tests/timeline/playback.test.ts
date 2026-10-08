import { describe, it, expect } from "vitest";
import {loadScoreFixture} from "../utils/helpers";
import {getMergedTimeline} from "../../src/fastXml/timeline";
import {getEventsForPart, getPlayback, getPlaybackScoreLengthSeconds, isPlaybackNote} from "../../src/fastXml/playback";

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
        // console.log("---------------------Old Macdonald");
        // console.log(playback);
    });
    it("construct a playback for FastMacDonald.musicxml", () => {
        const score = loadScoreFixture("FastMacdonald.musicxml");
        const timeline = getMergedTimeline(score);
        const playback = getPlayback(timeline);

        // 4 bars of 4 quarter notes at 240 bpm
        // 16 beats at 2 beats per seconds = 4 seconds
        const length = getPlaybackScoreLengthSeconds(playback);
        expect(length).toBe(4);

        expect(playback).toBeDefined();
        // console.log(playback);
    });
    it("validate piano roll for Handerna.musicxml", () => {
        const score = loadScoreFixture("Handerna.musicxml");
        const timeline = getMergedTimeline(score);

        // const parts = score["part-list"];
        //console.log(parts);

        // console.log("---------------------Handerna Sop");
        //console.log(filtered);

        // this first measure should have 8 1/8th notes
        // evenly spaced

        // check the timeline for a start
        const m1 = timeline[0];
        // console.log(m1);

        m1.events.forEach(ev => {
            if ("note" in ev) {
                if(ev.id == "P1") console.log("Note:", ev.note);
            }
        });

        const playback = getPlayback(timeline);
        const filtered = getEventsForPart(playback, "P1");
        expect(filtered).toBeDefined();
        expect(filtered.length).toBeGreaterThan(20); // just a ball park
        for(let i = 0; i < 20; i++)
        {
            const p = filtered[i];
            console.log("filtered:", p);
            if(isPlaybackNote(p))
            {
                console.log("p:", p.timeSeconds, p.durationSeconds, p.note.pitch);
            }
        }

        // console.log(playback);

        //  note: Bar 10, beat 4 is wrong. Add check to see why

        // Chan Mali Chan. Alto line is all wrong syncopation and rests


    });
});