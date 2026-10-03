import type { AudioChannel } from "../fastXml/channels";
import {getPartName} from "../fastXml/helpers";

export function PartSelector({
                                 channels,
                                 selectedIndex,
                                 onSelect
                             }: {
    channels: AudioChannel[];
    selectedIndex: number;
    onSelect: (index: number) => void;
}) {
    return (
        <div>
            {channels.map(ch => (
                <div
                    key={ch.index}
                    onClick={() => onSelect(ch.index)}
                    style={{
                        padding: "10px",
                        marginBottom: "8px",
                        borderRadius: "6px",
                        cursor: "pointer",
                        border: "1px solid #ccc",
                        background:
                            selectedIndex === ch.index
                                ? "#d0e6ff"
                                : "#f7f7f7"
                    }}
                >
                    {getPartName(ch.part)}
                </div>
            ))}
        </div>
    );
}














