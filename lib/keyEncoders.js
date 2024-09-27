import SubEncoder from "sub-encoder";
import c from "compact-encoding";
import {getPropFromMultipleObjects} from "./getPropFromMultipleObjects.js";

export const keyEncoder = new SubEncoder();
export const timeStampEncoder = c.from(keyEncoder.sub("__bb_tmsmp__"));

export function encodeKey(prefix, key, ...configs) {
    try {
        const keyEncoding = c.from(getPropFromMultipleObjects("keyEncoding", ...configs) || c.binary);

        const enc = prefix
            ? c.from(keyEncoder.sub(prefix, keyEncoding))  // Apply sub-encoder if prefix is provided
            : keyEncoding;  // Use regular encoding if no prefix

        return c.encode(enc, key);
    } catch (e) {
        throw new Error("Key encoding failed.");
    }
}