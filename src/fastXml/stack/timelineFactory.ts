import {getParts, type XmlScorePartwise} from "../helpers";
import {PartFactory} from "./partFactory";
import {type TimelineMeasure} from "../timeline";

export class TimelineFactory {

    pp:PartFactory = new PartFactory();

    reset()
    {
        this.pp = new PartFactory();
    }

    // each part has it's own timeline constructed
    processAllParts(score: XmlScorePartwise): TimelineMeasure[][] {
        const parts = getParts(score);
        return parts.map(part => this.pp.process(part));
    }

    // the timelines for all the parts are combined into a single
    // timeline, in time order. Each measure contains all the data
    // for that measure (from all parts)
    process(score: XmlScorePartwise): TimelineMeasure[]
    {
        const allParts = this.processAllParts(score);
        if(allParts.length == 0) return [];

        const numMeasures = allParts[0].length;
        let isValid = true;
        // all parts must have the same number of measures
        for(let partIndex = 0;  partIndex < allParts.length; partIndex++) {
            if(allParts[partIndex].length != numMeasures) {
                isValid = false;
                // we could throw an exception
            }
        }

        if(!isValid) return[];

        const mergedTimeline: TimelineMeasure[] = [];

        for(let measureIndex = 0; measureIndex < allParts[0].length; measureIndex++) {
            const mergedMeasure: TimelineMeasure = {name: allParts[0][measureIndex].name, events: []};
            for(let partIndex = 0;  partIndex < allParts.length; partIndex++) {
                mergedMeasure.events.push(...allParts[partIndex][measureIndex].events);
            }
            mergedMeasure.events.sort((a, b) => a.qnOffset - b.qnOffset);
            mergedTimeline.push(mergedMeasure);
        }

        return mergedTimeline;
    }
}

