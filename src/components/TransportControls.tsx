
import { useEffect } from "react";
import { PlaySession } from "../audio/PlaySession";
import { MicControlBar } from "../rendering/MicControlBar";

export function TransportControls({
                                      session,
                                      onOpenMicSettings
                                  }: {
    session: PlaySession,
    onOpenMicSettings: () => void
}) {
    // Global clock (authoritative time source)

    // Drive all visual components (PianoRoll, LyricView, Overview)
    useEffect(() => {
        let raf: number;

        function tick() {
            raf = requestAnimationFrame(tick);
        }

        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [session]);

    // Transport actions
    function handlePlay() {
        session.play();
    }

    function handlePause() {
        session.pause();
    }

    function handleStop() {
        session.pause();
    }

    function handleRewind() {
        session.seek(0);
    }

    function handleLoop() {
        // Looping will be implemented later
        // This button stays here for UI consistency
    }

    return (
        <div style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginTop: "20px",
            padding: "10px",
            background: "#222",
            borderRadius: "6px"
        }}>
            {/* ⭐ Mic control bar integrated here */}
            <MicControlBar
                session={session}
                onOpenSettings={onOpenMicSettings}
            />
            <button onClick={handlePlay} className="tbtn">▶</button>
            <button onClick={handlePause} className="tbtn">⏸</button>
            <button onClick={handleStop} className="tbtn">⏹</button>
            <button onClick={handleRewind} className="tbtn">⏮</button>
            <button onClick={handleLoop} className="tbtn">🔁</button>
        </div>
    );
}
