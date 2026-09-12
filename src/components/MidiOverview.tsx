import {useEffect, useRef} from "react";
import {TrackOverview} from "../rendering/TrackOverview";
import {MusicFormat, PlaySession} from "../audio/PlaySession";

export function MidiOverview({ session }: { session:PlaySession }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const overviewRef = useRef<TrackOverview | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Create renderer
        const overview = new TrackOverview(canvas, session);
        overviewRef.current = overview;

        const format:MusicFormat = session.getBackingFormat()

        switch(format) {
            case MusicFormat.None:
                break;
            case MusicFormat.Midi:
                {
                    const midi = session.getBackingMidi();
                    if(midi != null) {
                        // show all parts
                        overview.setMidi(midi,-1);
                    }
                }
                break;
            case MusicFormat.MusicXml:
                {
                    const score = session.getBackingScore();
                    if(score != null) {
                        // show all parts
                        overview.setScore(score,-1);
                    }
                }
                break;
            default:
                break;
        }

        overview.resize();

        let raf: number;

        function draw() {
            overview.render();                // ⭐ draw with current time
            raf = requestAnimationFrame(draw);
        }

        raf = requestAnimationFrame(draw);

        return () => cancelAnimationFrame(raf);
    }, [session]);



    useEffect(() => {
        function handleResize() {
            overviewRef.current?.resize();
        }
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    return (
        <canvas
            ref={canvasRef}
            style={{
                width: "100%",
                height: "100%",     // ⭐ REQUIRED
                display: "block"
            }}
        />
    );
}
