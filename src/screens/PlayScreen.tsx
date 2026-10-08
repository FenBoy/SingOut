import { useEffect, useState} from "react";
import {PlaySession, Results} from "../audio/PlaySession";
import { MidiViewer } from "../components/MidiViewer";
import { LyricView} from "../components/LyricView";
import {LoopViewer} from "../components/LoopViewer";
import {SettingsScreen} from "./SettingsScreen";

export function PlayScreen({
                               session,
                               onBack
                           }: {
    session: PlaySession;
    onBack: () => void;
}) {
    const [, forceUpdate] = useState(0);
    const [screen, setScreen] = useState<"play" | "settings">("play");
    const [showResults, setShowResults] = useState(false);
    const [results, setResults] = useState<Results | null>(null);

    function togglePlayPause() {
        if (session.getIsPlaying()) {
            session.pause();
        } else {
            session.play();
        }
    }

    useEffect(() => {
        const id = setInterval(() => {
            forceUpdate(x => x + 1);

            const r = session.getResults();
            if (!r.hasBeenShown() && session.isAtEnd()) {
                setResults(r);
                setShowResults(true);
                r.markShown();
            }
        }, 100);

        return () => clearInterval(id);
    }, [session]);

    if (screen === "settings") {
        return (
            <SettingsScreen
                session={session}
                onBack={() => setScreen("play")}
            />
        );
    }

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
            <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
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

                {session.isTrackReady() ? (
                    <>
                        <h2>{session.getTrackTitle()}</h2>
                        <h2>{session.getSelectedChannelTitle()}</h2>
                    </>
                ) : (
                    <h2>Loading track…</h2>
                )}

                <button
                    onClick={togglePlayPause}
                    style={{
                        padding: "8px 12px",
                        fontSize: "20px",
                        borderRadius: "6px",
                        border: "1px solid #ccc",
                        background: "#eee",
                        cursor: "pointer",
                        lineHeight: "20px"
                    }}
                >
                    {session.getIsPlaying() ? "⏸" : "▶"}
                </button>

                <button
                    onClick={() => setScreen("settings")}
                    style={{
                        padding: "8px 12px",
                        fontSize: "20px",
                        borderRadius: "6px",
                        border: "1px solid #ccc",
                        background: "#eee",
                        cursor: "pointer",
                        lineHeight: "20px"
                    }}
                >
                    ☰
                </button>
            </div>

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
                    <div style={{
                        flex: 0.2,
                        minHeight: 0,
                        padding: "10px 15px",
                        background: "#f0f4ff",
                        borderRadius: "8px",
                        border: "1px solid #d0d8f0"
                    }}>
                        <LoopViewer session={session}/>
                    </div>

                    <div style={{
                        flex: 3,
                        minHeight: 0,
                        padding: "10px 15px",
                        background: "#f0f4ff",
                        borderRadius: "8px",
                        border: "1px solid #d0d8f0"
                    }}>
                        <MidiViewer session={session}/>
                    </div>

                    {/*<div style={{*/}
                    {/*    flex: 1,*/}
                    {/*    minHeight: 0,*/}
                    {/*    maxHeight: "22vh",*/}
                    {/*    paddingLeft: "40px",*/}
                    {/*    paddingRight: "40px"*/}
                    {/*}}>*/}
                    {/*    <LyricView session={session}/>*/}
                    {/*</div>*/}
                </div>
            </div>

            {showResults && results && (
                <div style={{
                    position: "fixed",
                    inset: 0,
                    background: "rgba(0,0,0,0.6)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 9999
                }}>
                    <div style={{
                        background: "#1e293b",
                        color: "white",
                        padding: "24px",
                        borderRadius: "12px",
                        width: "320px",
                        textAlign: "center",
                        boxShadow: "0 0 20px rgba(0,0,0,0.4)"
                    }}>
                        <h2>Results</h2>

                        <div style={{
                            padding: "10px 15px",
                            background: "#f0f4ff",
                            borderRadius: "8px",
                            border: "1px solid #d0d8f0",
                            fontSize: "16px",
                            lineHeight: "22px",
                            display: "flex",
                            flexDirection: "row",
                            alignItems: "center",
                            gap: "12px"
                        }}>
                            <div>⭐ {results.getGoldScore()}</div>
                            <div>✨ {results.getSilverScore()}</div>
                            <div>🥉 {results.getBronzeScore()}</div>
                            <div>🤐 {results.getPenaltyScore()}</div>
                            <strong>Total: {results.getTotalScore()}</strong>
                        </div>

                        <button
                            onClick={() => setShowResults(false)}
                            style={{
                                marginTop: "20px",
                                padding: "8px 14px",
                                fontSize: "14px",
                                borderRadius: "6px",
                                border: "1px solid #ccc",
                                background: "#eee",
                                cursor: "pointer"
                            }}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
