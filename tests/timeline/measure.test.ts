import { describe, it, expect } from "vitest";
import {getMeasureEvents, type XmlMeasure, type XmlScorePartwise} from "../../src/fastXml/helpers";
import {MeasureFactory} from "../../src/fastXml/stack/measureFactory";
import {PartState} from "../../src/fastXml/stack/partFactory";
import type {TimelineMeasure} from "../../src/fastXml/timeline";
import {loadXml} from "../../src/fastXml/debug/load";

export function loadMeasure(snippet: string): XmlMeasure {
    const wrapped = `<root>${snippet}</root>`;
    const parsed = loadXml(wrapped) as { root: { measure: XmlMeasure } };
    return parsed.root.measure;
}

describe("measure tests", () => {
    it("specific issue with ChanMaliChan", () => {

        const xml = `<measure number="3" width="305.21">
            <note default-x="12.5" default-y="-366.2">
            <rest/>
            <duration>2</duration>
            <voice>1</voice>
            <type>eighth</type>
            </note>
            <note default-x="47.71" default-y="-396.2" dynamics="84.44">
            <pitch>
                <step>C</step>
            <octave>4</octave>
            </pitch>
            <duration>2</duration>
            <voice>1</voice>
            <type>eighth</type>
            <stem>up</stem>
            <lyric number="1" default-y="-50.32" relative-y="-30">
            <syllabic>single</syllabic>
            <text>do</text>
            </lyric>
            </note>
            <note default-x="47.71" default-y="-381.2" dynamics="84.44">
            <chord/>
            <pitch>
                <step>F</step>
            <octave>4</octave>
            </pitch>
            <duration>2</duration>
            <voice>1</voice>
            <type>eighth</type>
            <stem>up</stem>
            </note>
            <note default-x="82.93" default-y="-366.2">
            <rest/>
            <duration>2</duration>
            <voice>1</voice>
            <type>eighth</type>
            </note>
            <note default-x="118.14" default-y="-396.2" dynamics="84.44">
            <pitch>
                <step>C</step>
            <octave>4</octave>
            </pitch>
            <duration>2</duration>
            <voice>1</voice>
            <type>eighth</type>
            <stem>up</stem>
            <lyric number="1" default-y="-50.32" relative-y="-30">
            <syllabic>single</syllabic>
            <text>do</text>
            </lyric>
            <lyric number="1" default-y="-50.32" relative-y="-30">
            <syllabic>single</syllabic>
            <text>do</text>
            </lyric>
            </note>
            <note default-x="118.14" default-y="-381.2" dynamics="84.44">
            <chord/>
            <pitch>
                <step>F</step>
            <octave>4</octave>
            </pitch>
            <duration>2</duration>
            <voice>1</voice>
            <type>eighth</type>
            <stem>up</stem>
            </note>
            <note default-x="153.36" default-y="-366.2">
            <rest/>
            <duration>2</duration>
            <voice>1</voice>
            <type>eighth</type>
            </note>
            <note default-x="188.57" default-y="-396.2" dynamics="84.44">
            <pitch>
                <step>C</step>
            <octave>4</octave>
            </pitch>
            <duration>2</duration>
            <voice>1</voice>
            <type>eighth</type>
            <stem>up</stem>
            <lyric number="1" default-y="-50.32" relative-y="-30">
            <syllabic>single</syllabic>
            <text>do</text>
            </lyric>
            <lyric number="1" default-y="-50.32" relative-y="-30">
            <syllabic>single</syllabic>
            <text>do</text>
            </lyric>
            </note>
            <note default-x="188.57" default-y="-381.2" dynamics="84.44">
            <chord/>
            <pitch>
                <step>F</step>
            <octave>4</octave>
            </pitch>
            <duration>2</duration>
            <voice>1</voice>
            <type>eighth</type>
            <stem>up</stem>
            </note>
            <note default-x="223.79" default-y="-366.2">
            <rest/>
            <duration>2</duration>
            <voice>1</voice>
            <type>eighth</type>
            </note>
            <note default-x="259" default-y="-396.2" dynamics="84.44">
            <pitch>
                <step>C</step>
            <octave>4</octave>
            </pitch>
            <duration>2</duration>
            <voice>1</voice>
            <type>eighth</type>
            <stem>up</stem>
            <lyric number="1" default-y="-50.32" relative-y="-30">
            <syllabic>single</syllabic>
            <text>do</text>
            </lyric>
            <lyric number="1" default-y="-50.32" relative-y="-30">
            <syllabic>single</syllabic>
            <text>do</text>
            </lyric>
            </note>
            <note default-x="259" default-y="-381.2" dynamics="84.44">
            <chord/>
            <pitch>
                <step>F</step>
            <octave>4</octave>
            </pitch>
            <duration>2</duration>
            <voice>1</voice>
            <type>eighth</type>
            <stem>up</stem>
            </note>
            <barline location="right">
            <bar-style>light-heavy</bar-style>
            </barline>
            </measure>`;

        const measure = loadMeasure(xml);

        console.log("measure:", measure);

        // sanity check for parsing
        const events = getMeasureEvents(measure);
        expect(events.length).toBe(13);

        // this snippet used chord tones
        // chord tones shouldn't advance the note cursor

        const mf:MeasureFactory = new MeasureFactory();
        const ps:PartState = new PartState();
        // this part uses 4 divisions per quarter note
        ps.setDivisions(4);
        const tml:TimelineMeasure = mf.process(measure, "P3", ps);
        console.log("tml:", tml);
        tml.events.forEach((event) => console.log("event:", event));

        let lastQnStart:number = 0;
        let lastQnDuration:number = 0;
        tml.events.forEach((event) => {
            expect(event.qnOffset).toBeGreaterThanOrEqual(lastQnStart);
            lastQnStart = event.qnOffset;
            if(event.kind == "note" && event.note.duration)
            {
                lastQnDuration = (event.note.duration / ps.divisions);
            }
        });
        expect(lastQnStart + lastQnDuration).toBe(4);
    });
});