import { useState } from "react";
import type { PlaySession } from "../audio/PlaySession";
import type { AudioChannel } from "../fastXml/channels";

export function SettingsScreen({ session, onBack }: {
    session: PlaySession; onBack: () => void
}) {
    // Local UI state
    const [pitchShift, setPitchShift] = useState(session.getPitchShift());
    const [tempo, setTempo] = useState(session.getTempo());

    // ⭐ Local editable copy of AudioChannel[]
    const [channels, setChannels] = useState<AudioChannel[]>(() =>
        session.getChannels().map(ch => ({
            index: ch.index,
            muted: ch.muted,
            volume: ch.volume,
            pan: ch.pan,
            part: ch.part
        }))
    );

    function changePitch(delta: number) {
        setPitchShift(prev => prev + delta);
    }

    function changeTempo(delta: number) {
        setTempo(prev => Math.max(10, prev + delta));
    }

    function toggleChannel(index: number) {
        setChannels(prev =>
            prev.map(ch =>
                ch.index === index
                    ? { ...ch, muted: !ch.muted }
                    : ch
            )
        );
    }

    function applyAndBack() {
        session.setPitchShift(pitchShift);
        session.setTempo(tempo);
        session.setChannels(channels);   // ⭐ push changes back
        onBack();
    }

    return (
        <div style={{ padding: 20 }}>
            <h2>Settings</h2>

            {/* Pitch */}
            <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
                <button onClick={() => changePitch(-1)}>-</button>
                <span>{pitchShift}</span>
                <button onClick={() => changePitch(+1)}>+</button>
            </div>

            {/* Tempo */}
            <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
                <button onClick={() => changeTempo(-1)}>-</button>
                <span>{tempo} bpm</span>
                <button onClick={() => changeTempo(+1)}>+</button>
            </div>

            {/* Channels */}
            {channels.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                    <h3>Backing Track Parts</h3>

                    {channels.map(ch => (
                        <div
                            key={ch.index}   // ⭐ stable key
                            style={{ display: "flex", gap: "10px" }}
                        >
                            <input
                                type="checkbox"
                                checked={!ch.muted}
                                onChange={() => toggleChannel(ch.index)}
                            />
                            <span>{ch.part["part-name"] ?? ch.part["@_id"]}</span>
                        </div>
                    ))}
                </div>
            )}

            <button onClick={applyAndBack}>← Back</button>
        </div>
    );
}







