import { test, expect } from "vitest";
import { loadFixture } from "./utils/helpers";

test("Load Old MacDonald", () => {
    const xml = loadFixture("OldMacdonaldOut.musicxml");
    // Basic sanity checks
    expect(xml).toBeDefined();
});

test("Old MacDonald has parts", () => {
    const xml = loadFixture("OldMacdonaldOut.musicxml");

    const parts = xml.getElementsByTagName("part");
    expect(parts.length).toBeGreaterThan(0);
});

test("Old MacDonald has part-list entries", () => {
    const xml = loadFixture("OldMacdonaldOut.musicxml");

    const partList = xml.getElementsByTagName("score-part");
    expect(partList.length).toBeGreaterThan(0);

    const firstName = partList[0]
        .getElementsByTagName("part-name")[0]
        ?.textContent;

    expect(firstName).toBeDefined();
});