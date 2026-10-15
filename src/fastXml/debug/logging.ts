import type {TimelineEvent} from "../timeline";

export function logTimelineEvent(ev: TimelineEvent): void {
    switch (ev.kind) {
        case "note":
        {
            if(!ev.note.pitch)
            {
                console.log(ev.id,
                    `[REST] qnOffset=${ev.qnOffset} dur=${ev.note.duration}`
                );
            }
            else
            {
                console.log(ev.id,
                    `[NOTE] qnOffset=${ev.qnOffset} pitch=${ev.note.pitch?.step}${ev.note.pitch?.octave} dur=${ev.note.duration}`
                );
            }

        }
        break;

        case "direction":
            console.log(ev.id,
                `[DIRECTION] qnOffset=${ev.qnOffset} type=${JSON.stringify(ev.direction)}`
            );
            break;

        case "attributes":
            console.log(ev.id,
                `[ATTRIBUTES] qnOffset=${ev.qnOffset} divisions=${ev.attributes.divisions}`
            );
            break;
    }
}
