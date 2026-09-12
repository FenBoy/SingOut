import { useState } from 'react';
import { type Part, type Track, useManifest } from './useManifest';
import { PlayScreen } from "./screens/PlayScreen";
import { SelectScreen } from "./screens/SelectScreen";
import { TrackSelectionScreen } from "./screens/TrackSelectionScreen";

export default function App() {
    const { tracks, loading, error } = useManifest();

    const [screen, setScreen] = useState<'track' | 'part' | 'play'>('track');
    const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
    const [selectedPart, setSelectedPart] = useState<Part | null>(null);

    if (loading) return <div style={{ padding: 20 }}>Loading manifest…</div>;
    if (error) return <div style={{ padding: 20 }}>Error: {error}</div>;
    if (tracks.length === 0) return <div style={{ padding: 20 }}>No tracks found.</div>;

    // Screen 1: Track selection
    if (screen === 'track') {
        return (
            <TrackSelectionScreen
                tracks={tracks}
                onSelectTrack={(track) => {
                    setSelectedTrack(track);
                    setSelectedPart(null);
                    setScreen('part');
                }}
            />
        );
    }

    // Screen 2: Part selection
    if (screen === 'part' && selectedTrack) {
        return (
            <SelectScreen
                track={selectedTrack}
                selectedPart={selectedPart}
                onSelectPart={setSelectedPart}
                onGo={() => setScreen('play')}
            />
        );
    }

    // Screen 3: Play screen
    if (screen === 'play' && selectedTrack && selectedPart) {
        return (
            <PlayScreen
                track={selectedTrack}
                part={selectedPart}
                onBack={() => {
                    setScreen('track');
                    setSelectedTrack(null);
                    setSelectedPart(null);
                }}
            />
        );
    }

    return null;
}











