import { useEffect, useState } from "react";
import { PlaySession } from "../audio/PlaySession";

export function MicSettingsScreen({ session, onBack }: {
    session: PlaySession;
    onBack: () => void;
}) {
    const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
    const [sensitivity, setSensitivity] = useState(session.mic.sensitivity ?? 1);
    const [volume, setVolume] = useState(0);
    const [micEnabled, setMicEnabled] = useState(session.isMicOn);

    // Latency state (seconds)
    const [latency, setLatency] = useState(0);

    function toggleMic() {
        if (session.isMicOn) {
            session.setMicState(false);
            setMicEnabled(false);
        } else {
            session.setMicState(true);
            setMicEnabled(true);
        }
    }

    // Load audio input devices
    useEffect(() => {
        navigator.mediaDevices.enumerateDevices().then(list => {
            const inputs = list.filter(d => d.kind === "audioinput");
            setDevices(inputs);

            if (!selectedDeviceId && inputs.length > 0) {
                setSelectedDeviceId(inputs[0].deviceId);
            }
        });
    }, []);

    // Live mic volume preview
    useEffect(() => {
        const id = setInterval(() => {
            setVolume(session.getMicVolume());
        }, 50);
        return () => clearInterval(id);
    }, [session]);

    // Apply sensitivity
    useEffect(() => {
        session.mic.setSensitivity(sensitivity);
    }, [sensitivity, session]);

    return (
        <div style={{ padding: 30, fontFamily: "sans-serif" }}>
            <button
                onClick={onBack}
                style={{
                    marginBottom: "20px",
                    padding: "8px 14px",
                    fontSize: "14px",
                    borderRadius: "6px",
                    border: "1px solid #ccc",
                    background: "#eee",
                    cursor: "pointer"
                }}
            >
                ← Back
            </button>

            <h2>Microphone Settings</h2>

            {/* Input device selector */}
            <div style={{ marginTop: 20 }}>
                <label style={{ display: "block", marginBottom: 6 }}>
                    Input Device:
                </label>
                <select
                    value={selectedDeviceId ?? ""}
                    onChange={(e) => {
                        setSelectedDeviceId(e.target.value);
                        session.mic.switchDevice(e.target.value);
                    }}
                    style={{
                        padding: "8px",
                        fontSize: "14px",
                        borderRadius: "6px",
                        width: "100%"
                    }}
                >
                    {devices.map(d => (
                        <option key={d.deviceId} value={d.deviceId}>
                            {d.label || "Microphone"}
                        </option>
                    ))}
                </select>
            </div>

            {/* Sensitivity slider */}
            <div style={{ marginTop: 30 }}>
                <label style={{ display: "block", marginBottom: 6 }}>
                    Sensitivity: {sensitivity.toFixed(2)}
                </label>
                <input
                    type="range"
                    min={0.2}
                    max={3}
                    step={0.1}
                    value={sensitivity}
                    onChange={(e) => setSensitivity(parseFloat(e.target.value))}
                    style={{ width: "100%" }}
                />
            </div>

            <div style={{ marginTop: 30 }}>
                <label style={{ display: "block", marginBottom: 6 }}>
                    Latency: {latency.toFixed(2)} s
                </label>
                <input
                    type="range"
                    min={0.0}
                    max={1.0}
                    step={0.05}
                    value={latency}
                    onChange={(e) => {
                        const value = parseFloat(e.target.value);
                        setLatency(value);        // update React state
                        session.setLatency(value); // update PlaySession safely
                    }}
                    style={{ width: "100%" }}
                />
            </div>

            {/* Live volume preview */}
            <div style={{ marginTop: 30 }}>
                <label style={{ display: "block", marginBottom: 6 }}>
                    Live Volume:
                </label>
                <div style={{
                    height: "12px",
                    background: "#444",
                    borderRadius: "6px",
                    overflow: "hidden"
                }}>
                    <div
                        style={{
                            width: `${Math.min(1, volume * sensitivity) * 100}%`,
                            height: "100%",
                            background: volume > 0.7 ? "#e33" :
                                volume > 0.4 ? "#fc3" : "#3c3"
                        }}
                    />
                </div>
            </div>

            {/* Recording options */}
            <div style={{ marginTop: 40 }}>
                <h3>Recording Options</h3>
                <p style={{ opacity: 0.7 }}>
                    Recording is controlled from the mic panel in Play mode.
                </p>
            </div>

            <button
                onClick={toggleMic}
                style={{
                    marginTop: "12px",
                    padding: "10px 16px",
                    fontSize: "15px",
                    borderRadius: "6px",
                    border: "1px solid #ccc",
                    background: micEnabled ? "#ffdddd" : "#ddffdd",
                    cursor: "pointer"
                }}
            >
                {micEnabled ? "🔇 Turn Mic Off" : "🎤 Turn Mic On"}
            </button>
        </div>
    );
}

