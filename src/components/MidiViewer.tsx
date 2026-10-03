import { useEffect, useRef } from "react";
import { PianoRoll } from "../rendering/PianoRoll";
import { PlaySession} from "../audio/PlaySession";

export function MidiViewer({ session }: { session:PlaySession }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const pianoRollRef = useRef<PianoRoll | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Create renderer
        const pr = new PianoRoll(canvas,session);
        pianoRollRef.current = pr;
        pr.populateNotes();
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


