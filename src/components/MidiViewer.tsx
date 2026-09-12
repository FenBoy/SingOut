import { useEffect, useRef } from "react";
import { PianoRoll } from "../rendering/PianoRoll";
import {MusicFormat, PlaySession} from "../audio/PlaySession";

export function MidiViewer({ session }: { session:PlaySession }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const pianoRollRef = useRef<PianoRoll | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Create renderer
        const pr = new PianoRoll(canvas,session);
        pianoRollRef.current = pr;

        const format:MusicFormat = session.getReferenceFormat();

        switch(format) {
            case MusicFormat.None:
                break;
            case MusicFormat.Midi:
            {
                const midi = session.getReferenceMidi();
                if(midi != null) {
                    pr.setMidi(midi,session.getPart());
                }
            }
                break;
            case MusicFormat.MusicXml:
            {
                const score = session.getReferenceScore();
                if(score != null) {
                    pr.setScore(score,session.getPart());
                }
            }
            break;
            default:
                break;
        }

        pr.resize();

        let raf: number;

        function draw() {
            pr.render();
            raf = requestAnimationFrame(draw);
        }

        raf = requestAnimationFrame(draw);

        return () => cancelAnimationFrame(raf);
    }, [session]);


    useEffect(() => {
        function handleResize() {
            const pr = pianoRollRef.current;
            if (!pr) return;
            pr.resize();
        }

        window.addEventListener("resize", handleResize);
        handleResize();

        return () => window.removeEventListener("resize", handleResize);
    }, []);

    return (
        <canvas
            ref={canvasRef}
            style={{ width: "100%", height: "100%" }}
        />
    );
}


