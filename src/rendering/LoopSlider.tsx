import { useRef } from "react";

interface LoopSliderProps {
    maxTime: number;
    start: number;
    end: number;
    disabled: boolean;
    onChange: (range: { start: number; end: number }) => void;
}


export function LoopSlider({ maxTime, start, end, disabled, onChange }: LoopSliderProps) {
    const barRef = useRef<HTMLDivElement>(null);

    const drag = (update: (t: number) => void) => (e: MouseEvent) => {
        const rect = barRef.current!.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const ratio = Math.min(Math.max(x / rect.width, 0), 1);
        const time = ratio * maxTime;
        update(time);
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
                onMouseDown={() => {

                    if (disabled) return;

                    const move = drag((t) => onChange({ start: t, end }));
                    const up = () => {
                        window.removeEventListener("mousemove", move);
                        window.removeEventListener("mouseup", up);
                    };
                    window.addEventListener("mousemove", move);
                    window.addEventListener("mouseup", up);
                }}
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
                onMouseDown={() => {
                    if (disabled) return;
                    const move = drag((t) => onChange({ start, end: t }));
                    const up = () => {
                        window.removeEventListener("mousemove", move);
                        window.removeEventListener("mouseup", up);
                    };
                    window.addEventListener("mousemove", move);
                    window.addEventListener("mouseup", up);
                }}
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



