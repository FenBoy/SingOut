import type { Track } from "../useManifest";

export function TrackSelectionScreen({
                                         tracks,
                                         onSelectTrack
                                     }: {
    tracks: Track[];
    onSelectTrack: (track: Track) => void;
}) {
    return (
        <div style={{ padding: 30, fontFamily: "sans-serif" }}>
            <h1>Global Voices</h1>
            <p>Select a song to rehearse.</p>

            {tracks.map(track => (
                <div
                    key={track.id}
                    onClick={() => onSelectTrack(track)}
                    style={{
                        padding: 12,
                        marginTop: 10,
                        border: "1px solid #ddd",
                        borderRadius: 8,
                        cursor: "pointer",
                        background: "#fafafa"
                    }}
                >
                    <h3 style={{ margin: 0 }}>{track.title}</h3>
                    <div style={{ opacity: 0.7 }}>
                        {track.parts.length} parts available
                    </div>
                </div>
            ))}
        </div>
    );
}
