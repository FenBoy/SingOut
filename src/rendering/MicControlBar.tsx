import { useEffect, useState } from "react";
import type { PlaySession } from "../audio/PlaySession";

interface MicControlBarProps {
    session: PlaySession;
    onOpenSettings: () => void;
}

export function MicControlBar({ session, onOpenSettings } : MicControlBarProps) {
    const [volume, setVolume] = useState(0);

    useEffect(() => {
        const id = setInterval(() => {
            setVolume(session.getMicVolume());
        }, 50);
        return () => clearInterval(id);
    }, [session]);

    const pct = Math.min(1, volume) * 100;

    return (
        <div
            onClick={onOpenSettings}   // ⭐ clicking anywhere else opens settings
            style={{
                display: "flex",
                alignItems: "center",
                gap: "20px",
                padding: "10px",
                background: "rgb(243 242 237 / 0.8)",
                borderRadius: "8px",
                color: "white",
                cursor: "pointer"
            }}
        >
            {/* Volume meter */}
            <div style={{ width: "150px" }}>
                <div style={{
                    height: "10px",
                    background: "#444",
                    borderRadius: "5px",
                    overflow: "hidden"
                }}>
                    <div style={{
                        width: `${pct}%`,
                        height: "100%",
                        background: pct > 70 ? "#e33" : pct > 40 ? "#fc3" : "#3c3"
                    }} />
                </div>
                <div style={{ fontSize: "12px", opacity: 0.7 }}>
                    Mic Level
                </div>
            </div>

            {/* Record button */}
            <button
                onClick={(e) => {
                    e.stopPropagation();     // ⭐ prevents opening settings
                    session.setMicState(!session.isMicOn);
                }}
                style={{
                    padding: "8px 14px",
                    background: session.isMicOn ? "#e33" : "#b30000",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "14px"
                }}
            >
                ● {session.isMicOn ? "Recording…" : "Record"}
            </button>
        </div>
    );
}
