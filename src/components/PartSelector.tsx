import { List, ListItem, ListItemButton, ListItemText } from "@mui/material";
import type { Part } from "../useManifest";

export function PartSelector({
                                 parts,
                                 selectedPart,
                                 onChange
                             }: {
    parts: Part[];
    selectedPart: Part | null;
    onChange: (part: Part) => void;
}) {
    return (
        <List>
            {parts.map(p => {
                const selected = selectedPart?.name === p.name;

                return (
                    <ListItem key={p.name} disablePadding>
                        <ListItemButton
                            selected={selected}
                            onClick={() => onChange(p)}
                        >
                            <ListItemText primary={p.name} />
                        </ListItemButton>
                    </ListItem>
                );
            })}
        </List>
    );
}







