import { List, ListItem, ListItemButton, ListItemIcon, Checkbox, ListItemText } from "@mui/material";
import type { Track } from "../useManifest";

export function TrackSelector({
                                  tracks,
                                  selectedTrack,
                                  onChange
                              }: {
    tracks: Track[];
    selectedTrack: Track | null;
    onChange: (track: Track) => void;
}) {
    return (
        <List>
            {tracks.map(track => {
                const checked = selectedTrack?.title === track.title;

                return (
                    <ListItem key={track.title} disablePadding>
                        <ListItemButton onClick={() => onChange(track)}>
                            <ListItemIcon>
                                <Checkbox edge="start" checked={checked} />
                            </ListItemIcon>
                            <ListItemText primary={track.title} />
                        </ListItemButton>
                    </ListItem>
                );
            })}
        </List>
    );
}
