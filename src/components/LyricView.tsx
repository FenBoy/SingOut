import { useEffect, useRef } from "react";
import {type PlaySession} from "../audio/PlaySession";
import {Cue} from "../rendering/Cue";

export function LyricView({ session }: { session: PlaySession }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const autoRef = useRef<Cue | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const auto = new Cue(canvas, session);
        autoRef.current = auto;
        auto.populateNotes();
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
