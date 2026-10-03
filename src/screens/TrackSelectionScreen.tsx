import type {ManifestTrack} from "../useManifest";

export function TrackSelectionScreen({
                                         tracks,
                                         onSelectSession
                                     }: {
    tracks: ManifestTrack[];
    onSelectSession: (track: ManifestTrack) => void;
}) {

    return (
        <div>
            {tracks.map(track => (
                <div
                    key={track.title}
                    onClick={() => onSelectSession(track)}
                >
                    <h3>{track.title}</h3>
                </div>
            ))}
        </div>
    );
}