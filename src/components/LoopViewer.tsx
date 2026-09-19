import { useEffect, useRef } from "react";
import { Looper } from "../rendering/Looper";
import {MusicFormat, PlaySession} from "../audio/PlaySession";

export function LoopViewer({ session }: { session:PlaySession }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const looperRef = useRef<Looper | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Create renderer
        const looper = new Looper(canvas,session);
        looperRef.current = looper;

        const format:MusicFormat = session.getReferenceFormat();

        switch(format) {
            case MusicFormat.None:
                break;
            case MusicFormat.MusicXml:
            {
                const score = session.getReferenceScore();
                if(score != null) {
                    looper.setScore(score,session.getPart());
                }
            }
                break;
            default:
                break;
        }

        looper.resize();

        let raf: number;

        function draw() {
            looper.render();
            raf = requestAnimationFrame(draw);
        }

        raf = requestAnimationFrame(draw);

        return () => cancelAnimationFrame(raf);
    }, [session]);


    useEffect(() => {
        function handleResize() {
            const pr = looperRef.current;
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