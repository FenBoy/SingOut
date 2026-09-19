import { useRef } from "react";

interface LoopSliderProps {
    maxTime: number;
    start: number;
    end: number;
    disabled: boolean;
    onChange: (range: { start: number; end: number }) => void;
    minSize?: number; // optional minimum loop length
}

export function LoopSlider({ maxTime, start, end, disabled, onChange, minSize = 0 }: LoopSliderProps) {
    const barRef = useRef<HTMLDivElement>(null);

    const getTimeFromEvent = (clientX: number) => {
        const rect = barRef.current!.getBoundingClientRect();
        const x = clientX - rect.left;
        const ratio = Math.min(Math.max(x / rect.width, 0), 1);
        return ratio * maxTime;
    };

    const startDrag = (update: (t: number) => void) => (e: MouseEvent | TouchEvent) => {
        if (disabled) return;

        const clientX = e instanceof MouseEvent ? e.clientX : e.touches[0].clientX;
        const time = getTimeFromEvent(clientX);
        update(time);
    };

    const attachDrag = (update: (t: number) => void) => {
        const move = startDrag(update);
        const up = () => {
            window.removeEventListener("mousemove", move as any);
            window.removeEventListener("mouseup", up);
            window.removeEventListener("touchmove", move as any);
            window.removeEventListener("touchend", up);
        };

        window.addEventListener("mousemove", move as any);
        window.addEventListener("mouseup", up);
        window.addEventListener("touchmove", move as any);
        window.addEventListener("touchend", up);
    };

    return (
        <div
            ref={barRef}
            style={{
                position: "relative",
                height: "20px",
                background: disabled ? "#ccc" : "#ddd",
                opacity: disabled ? 0.5 : 1,
                pointerEvents: disabled ? "none" : "auto",
                margin: "20px 0"
            }}
        >
            {/* Filled region */}
            <div
                style={{
                    position: "absolute",
                    left: `${(start / maxTime) * 100}%`,
                    width: `${((end - start) / maxTime) * 100}%`,
                    height: "100%",
                    background: "rgba(0,150,255,0.3)"
                }}
            />

            {/* Start handle */}
            <div
                onMouseDown={() =>
                    attachDrag((t) => {
                        const newStart = Math.min(t, end - minSize);
                        onChange({ start: newStart, end });
                    })
                }
                onTouchStart={() =>
                    attachDrag((t) => {
                        const newStart = Math.min(t, end - minSize);
                        onChange({ start: newStart, end });
                    })
                }
                style={{
                    position: "absolute",
                    left: `${(start / maxTime) * 100}%`,
                    top: 0,
                    width: "10px",
                    height: "20px",
                    background: "blue",
                    cursor: "ew-resize"
                }}
            />

            {/* End handle */}
            <div
                onMouseDown={() =>
                    attachDrag((t) => {
                        const newEnd = Math.max(t, start + minSize);
                        onChange({ start, end: newEnd });
                    })
                }
                onTouchStart={() =>
                    attachDrag((t) => {
                        const newEnd = Math.max(t, start + minSize);
                        onChange({ start, end: newEnd });
                    })
                }
                style={{
                    position: "absolute",
                    left: `${(end / maxTime) * 100}%`,
                    top: 0,
                    width: "10px",
                    height: "20px",
                    background: "red",
                    cursor: "ew-resize"
                }}
            />
        </div>
    );
}




