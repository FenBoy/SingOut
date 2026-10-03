import { useEffect, useState } from 'react';

export interface ManifestPart {
    name: string;       // this will now identify the element in the MusicXml
    backing: string;    // and a specific audio (backing tape)
}

export interface ManifestTrack {
    title: string;
    reference: string;  // A music XML or mxl (parts will be extracted)
    parts?: ManifestPart[];     // for specific part tapes
}

export function useManifest() {
    const [tracks, setTracks] = useState<ManifestTrack[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {

        //?manifest=https://raw.githubusercontent.com/FenBoy/GlobalVoices/main/manifest.json

        let url:string = 'https://raw.githubusercontent.com/FenBoy/GlobalVoices/main/manifest.json';
        const params = new URLSearchParams(window.location.search);
        const manifestUrl = params.get("manifest");
        if(manifestUrl != null)
        {
            url = manifestUrl;
        }

        const stamp = `?${Date.now()}`;

        if (!url.endsWith(stamp)) {
            url = url + stamp;
        }

        fetch(url)
            .then(res => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.json();
            })
            .then(data => {
                setTracks(data.tracks as ManifestTrack[]);
                setLoading(false);
            })
            .catch(err => {
                setError(String(err));
                setLoading(false);
            });
    }, []);

    return { tracks, loading, error };
}
