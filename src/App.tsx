import { useState } from 'react';
import {PlaySession} from "./audio/PlaySession";
import {TrackSelectionScreen} from "./screens/TrackSelectionScreen";
import {useManifest} from "./useManifest";
import {SelectScreen} from "./screens/SelectScreen";
import {PlayScreen} from "./screens/PlayScreen";

export default function App() {
    const { tracks, loading, error } = useManifest();

    const [screen, setScreen] = useState<'track' | 'part' | 'play'>('track');
    const [session, setSession] = useState<PlaySession | null>(null);

    if (loading) return <div style={{ padding: 20 }}>Loading manifest…</div>;
    if (error) return <div style={{ padding: 20 }}>Error: {error}</div>;
    if (tracks.length === 0) return <div style={{ padding: 20 }}>No tracks found.</div>;

    // Screen 1: Track selection
    if (screen === 'track') {
        return (
            <TrackSelectionScreen
                tracks={tracks}
                onSelectSession={async (track) => {
                    const s = new PlaySession();
                    await s.loadTrack(track);
                    setSession(s);
                    setScreen('part');
                }}
            />
        );
    }

    // Screen 2: Part selection
    if (screen === 'part' && session) {
        return (
            <SelectScreen
                session={session}
                onGo={() => setScreen('play')}
            />
        );
    }

    // Screen 3: Play screen
    if (screen === 'play' && session) {
        return (
            <PlayScreen
                session={session}
                onBack={() => {
                    setScreen('track');
                    setSession(null);
                }}
            />
        );
    }

    return null;
}











