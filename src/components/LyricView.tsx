import { useEffect, useRef } from "react";
import { LyricPanel } from "../rendering/LyricPanel";
import {MusicFormat, type PlaySession} from "../audio/PlaySession";

export function LyricView({ session }: { session: PlaySession }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const lyricRef = useRef<LyricPanel | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const lp = new LyricPanel(canvas, session);
        lyricRef.current = lp;

        const format:MusicFormat = session.getBackingFormat()

        switch(format) {
            case MusicFormat.None:
                break;
            case MusicFormat.Midi:
            {
                const midi = session.getBackingMidi();
                if(midi != null) {
                    lp.setMidi(session.getReferenceMidi(), session.getPart());
                }
            }
                break;
            case MusicFormat.MusicXml:
            {
                const score = session.getBackingScore();
                if(score != null) {
                    lp.setScore(score,session.getPart());
                }
            }
                break;
            default:
                break;
        }

        lp.resize();

        let raf: number;

        function draw() {
            lp.render();
            raf = requestAnimationFrame(draw);
        }

        raf = requestAnimationFrame(draw);

        return () => cancelAnimationFrame(raf);
    }, [session]);


    useEffect(() => {
        function handleResize() {
            lyricRef.current?.resize();
        }
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    return (
        <canvas
            ref={canvasRef}
            style={{
                width: "100%",
                height: "100%",
                display: "block"
            }}
        />
    );
}
