import { useEffect, useRef } from "react";
// import { LyricPanel } from "../rendering/LyricPanel";
import {AutoCue} from "../rendering/AutoCue";
import {MusicFormat, type PlaySession} from "../audio/PlaySession";

export function LyricView({ session }: { session: PlaySession }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const autoRef = useRef<AutoCue | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const auto = new AutoCue(canvas, session);
        autoRef.current = auto;

        const format:MusicFormat = session.getBackingFormat()

        switch(format) {
            case MusicFormat.None:
                break;
            case MusicFormat.MusicXml:
            {
                const score = session.getBackingScore();
                if(score != null) {
                    auto.setScore(score,session.getPart());
                }
            }
                break;
            default:
                break;
        }

        auto.resize();

        let raf: number;

        function draw() {
            auto.render();
            raf = requestAnimationFrame(draw);
        }

        raf = requestAnimationFrame(draw);

        return () => cancelAnimationFrame(raf);
    }, [session]);


    useEffect(() => {
        function handleResize() {
            autoRef.current?.resize();
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
