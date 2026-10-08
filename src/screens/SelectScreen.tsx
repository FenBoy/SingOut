import { useState } from "react";
import type { PlaySession } from "../audio/PlaySession";
import { PartSelector } from "../components/PartSelector";

export function SelectScreen({
                                 session,
                                 onGo
                             }: {
    session: PlaySession;
    onGo: () => void;
}) {
    // React does NOT track changes inside session, so we trigger a re-render manually
    const [, forceUpdate] = useState(0);

    const channels = session.getChannels();
    const selectedId = session.getSelectedPartId();   // ⭐ now ID-based

    return (
        <div style={{
            fontFamily: 'sans-serif',
            padding: '30px',
            maxWidth: '700px',
            margin: '0 auto'
        }}>

            <div style={{
                marginBottom: '30px',
                padding: '20px',
                background: '#f0f4ff',
                borderRadius: '10px',
                border: '1px solid #d0d8f0'
            }}>
                <h1 style={{ margin: 0 }}>Global Voices</h1>
                <p style={{ marginTop: '10px', fontSize: '16px', color: '#444' }}>
                    Select the vocal part you want to rehearse.
                </p>
            </div>

            <div style={{
                padding: '20px',
                borderRadius: '10px',
                border: '1px solid #ddd',
                background: '#fafafa'
            }}>
                <h2 style={{ marginTop: 0 }}>
                    {session.getTrackTitle() ?? "Selected Track"}
                </h2>

                <PartSelector
                    channels={channels}
                    selectedId={selectedId}
                    onSelect={(id) => {
                        session.setSelectedPartId(id);   // ⭐ store ID
                        forceUpdate(x => x + 1);         // ⭐ trigger re-render
                    }}
                />

                <button
                    onClick={onGo}
                    disabled={!selectedId}
                    style={{
                        marginTop: '20px',
                        padding: '12px 20px',
                        fontSize: '16px',
                        borderRadius: '6px',
                        border: 'none',
                        background: selectedId ? '#0077ff' : '#ccc',
                        color: 'white',
                        cursor: selectedId ? 'pointer' : 'not-allowed'
                    }}
                >
                    Go
                </button>
            </div>
        </div>
    );
}








