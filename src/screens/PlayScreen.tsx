import { useEffect, useState } from "react";
import { PlaySession } from "../audio/PlaySession";
import { MidiViewer } from "../components/MidiViewer";
import { MidiOverview } from "../components/MidiOverview";
import { AudioView} from "../components/AudioView";
import { LyricView} from "../components/LyricView";
import { TransportControls } from "../components/TransportControls";
import type { Track, Part } from "../useManifest";
import { MicSettingsScreen } from "./MicSettingsScreen";
import { LoopSlider} from "../rendering/LoopSlider";

export function PlayScreen({ track, part, onBack }: {
    track: Track;
    part: Part;
    onBack: () => void;
}) {
    const [session, setSession] = useState<PlaySession | null>(null);
    const [, forceUpdate] = useState(0);
    const [screen, setScreen] = useState<"play" | "mic-settings">("play");


    useEffect(() => {
        const s = new PlaySession(track, part);
        s.load().then(() => {
            setSession(s);
        });
    }, [track, part]);

    useEffect(() => {
        const id = setInterval(() => forceUpdate(x => x + 1), 100);
        return () => clearInterval(id);
    }, []);

    if (!session) {
        return <div style={{ padding: 20 }}>Loading…</div>;
    }

    if (screen === "mic-settings") {
        return (
            <MicSettingsScreen
                session={session}
                onBack={() => setScreen("play")}
            />
        );
    }

    // resizing
    return (
        <div style={{
            fontFamily: 'sans-serif',
            padding: '20px',
            display: "flex",
            flexDirection: "column",
            height: "100vh",
            boxSizing: "border-box",
            gap: "20px"
        }}>
            <button
                onClick={() => {
                    session.pause();
                    onBack();
                }}
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

            <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
            }}>
                <h2>{track.title}</h2>

                <h2>Part: {part.name}</h2>

                <h2>
                    Time: {
                    (() => {
                        const t = session.getCurrentTime();
                        const m = Math.floor(t / 60);
                        const s = Math.floor(t % 60);
                        return `${m}:${s.toString().padStart(2, "0")}`;
                    })()
                }
                </h2>

                <div style={{
                    padding: "10px 15px",
                    background: "#f0f4ff",
                    borderRadius: "8px",
                    border: "1px solid #d0d8f0",
                    fontSize: "16px",
                    lineHeight: "22px",
                    display: "flex",           // ⭐ make children horizontal
                    flexDirection: "row",      // ⭐ explicit horizontal direction
                    alignItems: "center",      // vertically center icons
                    gap: "12px"                // spacing between items
                }}>
                    <div>⭐ {session.getGoldScore()}</div>
                    <div>✨ {session.getSilverScore()}</div>
                    <div>🥉 {session.getBronzeScore()}</div>
                    <div>🤐 {session.getPenaltyScore()}</div>
                    <strong>Total: {session.getTotalScore()}</strong>
                </div>

            </div>

            {/* ⭐ Responsive content area */}
            <div style={{
                display: "flex",
                flexDirection: "column",
                flex: 1,
                minHeight: 0,
                gap: "20px"
            }}>
                <div style={{
                    display: "flex",
                    flexDirection: "column",
                    flex: 1,
                    minHeight: 0,
                    gap: "12px"
                }}>
                    <LoopSlider
                        maxTime={session.getMaxTime()}
                        start={session.getLoopStart()}
                        end={session.getLoopEnd()}
                        disabled={session.getIsPlaying()}
                        onChange={({ start, end }) => {
                            session.setLoopStart(start);
                            session.setLoopEnd(end);
                        }}
                    />


                    {/* ⭐ Bigger piano roll */}
                    <div style={{
                        flex: 3,
                        minHeight: 0,
                        padding: "10px 15px",
                        background: "#f0f4ff",
                        borderRadius: "8px",
                        border: "1px solid #d0d8f0"}}>
                        <MidiViewer session={session} />
                    </div>

                    {/* ⭐ Smaller lyrics */}
                    <div style={{
                        flex: 1,
                        minHeight: 0,
                        maxHeight: "22vh",
                        paddingLeft: "40px",
                        paddingRight: "40px"
                    }}>
                        <LyricView session={session} />
                    </div>
                </div>
            </div>

            {/* ⭐ Playback section */}
            <div style={{
                display: "flex",
                flexDirection: "column",
                flex: 0.4,          // ⭐ shrink the whole playback block
                minHeight: 0,
                padding: "10px 15px",
                background: "#f0f4ff",
                borderRadius: "8px",
                border: "1px solid #d0d8f0",
                overflow: "hidden"  // ⭐ prevents canvas overflow
            }}>
                {/* ⭐ Overview fills remaining space */}
                <div style={{
                    flex: 1,         // ⭐ this is the magic: fills leftover space
                    minHeight: 0,
                    minWidth: 0,
                    display: "flex"
                }}>
                    {session.isMidi() && <MidiOverview session={session} />}
                    {session.isAudio() && <AudioView session={session} />}
                </div>

                {/* ⭐ Transport controls fixed height */}
                <div style={{
                    flexShrink: 0,   // ⭐ prevents it from stretching
                    paddingTop: "10px"
                }}>
                    <TransportControls
                        session={session}
                        onOpenMicSettings={() => setScreen("mic-settings")}
                    />
                </div>
            </div>


        </div>
    );
}
