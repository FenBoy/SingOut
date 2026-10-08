import { useState } from "react";
import type { PlaySession } from "../audio/PlaySession";
import type { AudioChannel } from "../fastXml/channels";
import {getPartName} from "../fastXml/helpers";

export function SettingsScreen({ session, onBack }: {
    session: PlaySession; onBack: () => void
}) {

    const [pitchShift, setPitchShift] = useState(session.getPitchShift());
    const [tempo, setTempo] = useState(session.getTempo());

    // ⭐ Use actual channel objects (no cloning)
    const [channels, setChannels] = useState<AudioChannel[]>(() =>
        session.getChannels()
    );

    function changePitch(delta: number) {
        setPitchShift(prev => prev + delta);
    }

    function changeTempo(delta: number) {
        setTempo(prev => Math.max(10, prev + delta));
    }

    // ⭐ Volume slider
    function changeVolume(ch: AudioChannel, value: number) {
        ch.gain.gain.value = value;
        setChannels([...channels]);
    }

    // ⭐ Pan slider
    function changePan(ch: AudioChannel, value: number) {
        ch.panNode.pan.value = value;
        setChannels([...channels]);
    }

    function applyAndBack() {
        session.setPitchShift(pitchShift);
        session.setTempo(tempo);

        // Channels are already updated live
        session.setChannels(channels);

        onBack();
    }

    return (
        <div style={{ padding: 20 }}>
            <h2>Settings</h2>

            {/* Key */}
            <div style={{ marginBottom: 20 }}>
                <strong>Key:</strong> {session.getKey()}
            </div>

            {/* Pitch Shift */}
            <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", marginBottom: 6 }}>
                    <strong>Pitch Shift (semitones)</strong>
                </label>
                <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={() => changePitch(-1)}>-</button>
                    <span>{pitchShift}</span>
                    <button onClick={() => changePitch(+1)}>+</button>
                </div>
            </div>

            {/* Tempo */}
            <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", marginBottom: 6 }}>
                    <strong>Tempo (BPM)</strong>
                </label>
                <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={() => changeTempo(-1)}>-</button>
                    <span>{tempo} bpm</span>
                    <button onClick={() => changeTempo(+1)}>+</button>
                </div>
            </div>

            {/* Mixer */}
            {channels.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                    <h3>Backing Track Parts</h3>

                    {channels.map(ch => (
                        <div
                            key={ch.part["@_id"]}
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "6px",
                                padding: "10px 0",
                                borderBottom: "1px solid #ddd"
                            }}
                        >
                            {/* Part name */}
                            <div style={{ fontWeight: "bold" }}>
                                {getPartName(ch.part)}
                            </div>

                            {/* Volume */}
                            <label style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                <span style={{ width: "80px" }}>Volume</span>
                                <input
                                    type="range"
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    value={ch.gain.gain.value}
                                    onChange={e => changeVolume(ch, parseFloat(e.target.value))}
                                    style={{ flex: 1 }}
                                />
                            </label>

                            {/* Pan */}
                            <label style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                <span style={{ width: "80px" }}>Pan</span>
                                <input
                                    type="range"
                                    min={-1}
                                    max={1}
                                    step={0.01}
                                    value={ch.panNode.pan.value}
                                    onChange={e => changePan(ch, parseFloat(e.target.value))}
                                    style={{ flex: 1 }}
                                />
                            </label>
                        </div>
                    ))}
                </div>
            )}

            <button onClick={applyAndBack}>← Back</button>
        </div>
    );

}








