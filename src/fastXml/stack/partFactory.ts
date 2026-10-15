import {getMeasures, type XmlPart} from "../helpers";
import {MeasureFactory} from "./measureFactory";
import {type TimelineMeasure} from "../timeline";

// divisions are maintained at part level
// we process one part at a time
// (so only one PartState required)
export class PartState {

    divisions:number;

    constructor() {
        this.divisions=1;
    }

    reset() {
        this.divisions=1;
    }

    setDivisions(divisions:number) {
        this.divisions = divisions;
    }
}

export class PartFactory {

    // maintain the division info at part level
    ps: PartState = new PartState();
    mp: MeasureFactory = new MeasureFactory();

    constructor() {
    }

    // process the part. we get an array of timeline measures for the
    // part, in the original sequence order
    process(part:XmlPart):TimelineMeasure[] {
        const timeline: TimelineMeasure[] = [];
        const measures = getMeasures(part);
        // reset the part specific data (divisions)
        this.ps.reset();
        // reset the voice specific data (cursors)
        this.mp.reset();
        measures.forEach((measure) => {
            timeline.push(this.mp.process(measure,part["@_id"],this.ps));
        })
        return timeline;
    }
}