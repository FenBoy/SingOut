import { useRef } from "react";
import { PlaySession } from "../audio/PlaySession";

export function PlayBar({ session }: { session: PlaySession }) {
    const barRef = useRef<HTMLDivElement>(null);

    const maxTime = session.getMaxTime();
    const current = session.getCurrentTime();
    const start = session.getLoopStart();
    const end = session.getLoopEnd();

    const measures = session.getMeasureBoundaries();

    function drag(handler: (t: number) => void) {
        return () => {
            const move = (ev: MouseEvent) => {
                const rect = barRef.current!.getBoundingClientRect();
                const ratio = Math.min(Math.max((ev.clientX - rect.left) / rect.width, 0), 1);
                let t = ratio * maxTime;

                // clamp to loop region if active
                // t = Math.max(start, Math.min(t, end));

                handler(t);
            };

            const up = () => {
                window.removeEventListener("mousemove", move);
                window.removeEventListener("mouseup", up);
            };

            window.addEventListener("mousemove", move);
            window.addEventListener("mouseup", up);
        };
    }

    return (
        <div style={{ width: "100%", userSelect: "none" }}>

            {/* ⭐ BAR MARKERS (top) */}
            <div style={{ position: "relative", height: "20px" }}>
                {measures.map(m => (
                    <div key={m.measure}
                         style={{
                             position: "absolute",
                             left: `${(m.time / maxTime) * 100}%`,
                             top: 0,
                             width: "1px",
                             height: "100%",
                             background: "#666"
                         }}
                    >
                        <div style={{
                            position: "absolute",
                            top: "-14px",
                            left: "-4px",
                            fontSize: "10px",
                            color: "#333"
                        }}>
                            {m.measure + 1}
                        </div>
                    </div>
                ))}
            </div>

            {/* ⭐ MAIN BAR */}
            <div
                ref={barRef}
                style={{
                    position: "relative",
                    height: "24px",
                    background: "#ddd",
                    borderRadius: "6px",
                    margin: "4px 0"
                }}
            >
                {/* Loop region */}
                <div
                    style={{
                        position: "absolute",
                        left: `${(start / maxTime) * 100}%`,
                        width: `${((end - start) / maxTime) * 100}%`,
                        height: "100%",
                        background: "rgba(0,150,255,0.3)"
                    }}
                />

                {/* Start marker */}
                <div
                    onMouseDown={drag(t => session.setLoopStart(t))}
                    style={{
                        position: "absolute",
                        left: `${(start / maxTime) * 100}%`,
                        top: 0,
                        width: "10px",
                        height: "24px",
                        background: "blue",
                        cursor: "ew-resize"
                    }}
                />

                {/* End marker */}
                <div
                    onMouseDown={drag(t => session.setLoopEnd(t))}
                    style={{
                        position: "absolute",
                        left: `${(end / maxTime) * 100}%`,
                        top: 0,
                        width: "10px",
                        height: "24px",
                        background: "red",
                        cursor: "ew-resize"
                    }}
                />

                {/* Playhead */}
                <div
                    onMouseDown={drag(t => session.seek(t))}
                    style={{
                        position: "absolute",
                        left: `${(current / maxTime) * 100}%`,
                        top: 0,
                        width: "4px",
                        height: "24px",
                        background: "black",
                        cursor: "ew-resize"
                    }}
                />
            </div>

            {/* ⭐ TIME MARKERS (bottom) */}
            <div style={{ position: "relative", height: "20px" }}>
                {Array.from({ length: Math.ceil(maxTime) }, (_, i) => i)
                    .filter(sec => sec % 10 === 0)
                    .map(sec => (
                        <div key={sec}
                             style={{
                                 position: "absolute",
                                 left: `${(sec / maxTime) * 100}%`,
                                 top: 0,
                                 width: "1px",
                                 height: "100%",
                                 background: "#aaa"
                             }}
                        >
                            <div style={{
                                position: "absolute",
                                top: "2px",
                                left: "-10px",
                                fontSize: "10px",
                                color: "#555"
                            }}>
                                {Math.floor(sec / 60)}:{(sec % 60).toString().padStart(2, "0")}
                            </div>
                        </div>
                    ))}
            </div>
        </div>
    );
}

