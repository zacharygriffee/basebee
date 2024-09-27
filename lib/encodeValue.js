import b4a from "b4a";
import c from "compact-encoding";
import {getPropFromMultipleObjects} from "./getPropFromMultipleObjects.js";

export function encodeValue(value, ...configs) {
    if (b4a.isBuffer(value)) return value;
    const enc = c.from(getPropFromMultipleObjects("valueEncoding", ...configs) || c.binary);
    return c.encode(enc, value);
}