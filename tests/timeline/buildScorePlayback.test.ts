import { describe, it, expect, beforeAll } from "vitest";
import {loadScoreFixture} from "../utils/helpers";

import {
    getParts, type XmlScorePartwise
} from "../../src/fastXml/helpers";

import {
    buildScorePlayback, isBarline, isBeat, isKeyChange, isPlaybackNote, isPlaybackTempo
} from "../../src/fastXml/playback";

describe("buildScorePlayback", () => {
    const PPQ = 480;

    let score: XmlScorePartwise;
    let parts;

    beforeAll(() => {
        score = loadScoreFixture("OldMacdonaldOut.musicxml");
        parts = getParts(score);
    });

    it("creates playback timelines for all parts", () => {
        const playback = buildScorePlayback(score, PPQ);

        // One timeline per part
        expect(playback.length).toBe(parts.length);

        // Each part must have events
        for (const partTimeline of playback) {
            expect(partTimeline.length).toBeGreaterThan(0);
        }
    });

    it("ensures each part timeline is sorted by timeSeconds", () => {
        const playback = buildScorePlayback(score, PPQ);

        for (const partTimeline of playback) {
            let last = -1;

            for (const ev of partTimeline) {
                expect(typeof ev.timeSeconds).toBe("number");
                expect(ev.timeSeconds).toBeGreaterThanOrEqual(last);
                last = ev.timeSeconds;

                console.log("Time (seconds)", ev.timeSeconds)

                if(isPlaybackNote(ev))
                {
                    console.log("Note: pitch", ev.note.pitch, "duration", ev.durationSeconds);
                }
                else
                if(isPlaybackTempo(ev))
                {
                    console.log("Tempo: bpm", ev.bpm);
                }
                else
                if(isBarline(ev))
                {
                    console.log("Bar:", ev.measureNumber);
                }
                else
                if(isBeat(ev))
                {
                    console.log("Beat:", ev.beatNumber);
                }
                else if(isKeyChange(ev))
                {
                    console.log("Key change: fifths", ev.fifths, "mode:", ev.mode);
                }
                else
                {
                    console.log("unexpected playback type")
                }
            }
        }
    });

    it("ensures tempo events appear in all parts at time 0", () => {
        const playback = buildScorePlayback(score, PPQ);

        for (const partTimeline of playback) {
            // Either the first event is a tempo event,
            // or the first tempo event is at time 0.
            const tempoEvent = partTimeline.find(ev => "bpm" in ev);

            expect(tempoEvent).toBeDefined();
            expect(tempoEvent?.timeSeconds).toBe(0);
        }
    });

    it("ensures timing is synced across all parts", () => {
        const playback = buildScorePlayback(score, PPQ);

        // Compare first note time across parts
        const firstNoteTimes = playback.map(partTimeline => {
            const firstNote = partTimeline.find(ev => "note" in ev);
            return firstNote?.timeSeconds ?? -1;
        });

        // All parts should start at the same time
        const first = firstNoteTimes[0];
        for (const t of firstNoteTimes) {
            expect(t).toBe(first);
        }
    });
});
