import { useEffect, useRef } from "react";
import { AudioPanel } from "../rendering/AudioPanel";
import { PlaySession } from "../audio/PlaySession";

export function AudioView({
                              session
                          }: {
    session: PlaySession
}) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const overviewRef = useRef<AudioPanel | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Create renderer
        const audioPanel = new AudioPanel(canvas, session);
        overviewRef.current = audioPanel;

        const audio = session.getBackingAudio();
        if(audio != null) {
            audioPanel.setAudio(audio);
        }
        audioPanel.resize();

        let raf: number;

        function draw() {
            audioPanel.render();                // ⭐ draw with current time
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
                height: "100%",
                display: "block"
            }}
        />

    );
}