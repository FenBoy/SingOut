import { test, expect } from "vitest";
import { loadFixture } from "./utils/helpers";
import {LoadModel} from "../src/MusicXml/mxmlParser";

test("Load Old MacDonald", () => {
    const xml = loadFixture("OldMacdonaldOut.musicxml");
    // Basic sanity checks
    expect(xml).toBeDefined();

    const score = LoadModel(xml);
    expect(score).toBeDefined();


});

