import fs from "node:fs";
import path from "node:path";
import { parseHTML } from "linkedom";
import type { XmlDoc } from "../../src/MusicXml/mxmlParser";
import {XMLParser} from "fast-xml-parser";
import type {XmlScorePartwise} from "../../src/fastXml/helpers";

export function loadFixture(name: string): XmlDoc {
    const filePath = path.join(process.cwd(), "tests", "fixtures", name);
    const xmlText = fs.readFileSync(filePath, "utf8");

    const { document } = parseHTML(xmlText);
    return document;
}

export function loadScoreFixture(name: string): XmlScorePartwise {
    const filePath = path.join(
        process.cwd(),
        "tests",
        "fixtures",
        name
    );

    const xmlText = fs.readFileSync(filePath, "utf8");

    const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: "@_",
        allowBooleanAttributes: true,
        parseAttributeValue: false,
        preserveOrder: false
    });

    const xml = parser.parse(xmlText);

    return xml["score-partwise"] as XmlScorePartwise;
}