import { PartSelector } from "../components/PartSelector";
import type { Track, Part } from "../useManifest";

export function SelectScreen({
                                 track,
                                 selectedPart,
                                 onSelectPart,
                                 onGo
                             }: {
    track: Track;
    selectedPart: Part | null;
    onSelectPart: (p: Part | null) => void;
    onGo: () => void;
}) {
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
                <h2 style={{ marginTop: 0 }}>{track.title}</h2>

                <PartSelector
                    parts={track.parts}
                    selectedPart={selectedPart}
                    onChange={onSelectPart}
                />

                <button
                    onClick={onGo}
                    disabled={!selectedPart}
                    style={{
                        marginTop: '20px',
                        padding: '12px 20px',
                        fontSize: '16px',
                        borderRadius: '6px',
                        border: 'none',
                        background: selectedPart ? '#0077ff' : '#ccc',
                        color: 'white',
                        cursor: selectedPart ? 'pointer' : 'not-allowed'
                    }}
                >
                    Go
                </button>
            </div>
        </div>
    );
}
