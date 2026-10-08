import type { AudioChannel } from "../fastXml/channels";
import { getPartName } from "../fastXml/helpers";

export function PartSelector({
                                 channels,
                                 selectedId,
                                 onSelect
                             }: {
    channels: AudioChannel[];
    selectedId: string | null;
    onSelect: (id: string) => void;
}) {
    return (
        <div>
            {channels.map(ch => {
                const id = ch.part["@_id"];

                return (
                    <div
                        key={id}
                        onClick={() => onSelect(id)}
                        style={{
                            padding: "10px",
                            marginBottom: "8px",
                            borderRadius: "6px",
                            cursor: "pointer",
                            border: "1px solid #ccc",
                            background:
                                selectedId === id
                                    ? "#d0e6ff"
                                    : "#f7f7f7"
                        }}
                    >
                        {getPartName(ch.part)}
                    </div>
                );
            })}
        </div>
    );
}















