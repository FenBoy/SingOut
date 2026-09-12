import { useEffect, useState } from 'react';

export interface Part {
    name: string;
    reference: string;
    backing?: string;
    part?: number;
}

export interface Track {
    id: string;
    title: string;
    parts: Part[];
}

export function useManifest() {
    const [tracks, setTracks] = useState<Track[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch('https://raw.githubusercontent.com/FenBoy/GlobalVoices/main/manifest.json?${Date.now()}')
            .then(res => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.json();
            })
            .then(data => {
                setTracks(data.tracks as Track[]);
                setLoading(false);
            })
            .catch(err => {
                setError(String(err));
                setLoading(false);
            });
    }, []);

    return { tracks, loading, error };
}
