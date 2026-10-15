import {XMLParser} from "fast-xml-parser";

export function loadXml(content: string): unknown {
    const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: "@_",
        allowBooleanAttributes: true,
        parseAttributeValue: false,
        preserveOrder: false
    });

    return parser.parse(content);
}