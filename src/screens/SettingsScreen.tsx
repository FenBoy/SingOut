import {useEffect, useRef} from "react";
import {TimelinePanel} from "../rendering/TimeLinePanel";
import type {PlaySession} from "../audio/PlaySession";

export function SettingsScreen({ session, onBack }: {
    session: PlaySession; onBack: () => void })
{
    const timelineRef = useRef<HTMLCanvasElement>(null);
    const timeline = useRef<TimelinePanel | null>(null);

    useEffect(() => {
        if (session && timelineRef.current) {
            timeline.current = new TimelinePanel(timelineRef.current, session);
        }
        return () => timeline.current?.destroy();
    }, [session]);

    useEffect(() => {
        const id = setInterval(() => {
            timeline.current?.draw();
        }, 100);

        return () => clearInterval(id);
    }, []);

    return (
        <div style={{ padding: 20 }}>
            <h2>Settings</h2>

            <p>More settings coming soon…</p>

            <canvas
                ref={timelineRef}
                width={800}
                height={40}
                style={{ width: "100%", height: "40px" }}
            />

            <button
                onClick={onBack}
                style={{
                    padding: '8px 14px',
                    fontSize: '14px',
                    borderRadius: '6px',
                    border: '1px solid #ccc',
                    background: '#eee',
                    cursor: 'pointer'
                }}
            >
                ← Back
            </button>
        </div>
    );
}
