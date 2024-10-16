// Transform function to handle prefix removal and filtering
import b4a from "b4a";
import {Streamx} from "./prebundles/from-cjs.js";
const {Transform} = Streamx;

export function createPrefixFilteringStream(prefix, stream) {
    const prefixBuffer = prefix ? b4a.concat([b4a.from(prefix), b4a.from("\0")]) : null; // Convert prefix to Buffer if it exists

    const transform = new Transform({
        transform(chunk, cb) {
            const isBuffer = b4a.isBuffer(chunk.key);
            const keyBuffer = isBuffer ? chunk.key : b4a.from(chunk.key);

            // Filter out keys that don't start with the prefix
            if (prefixBuffer && !keyBuffer.slice(0, prefixBuffer.length).equals(prefixBuffer)) {
                return cb(); // Skip this chunk (do not emit)
            }

            // Strip the prefix from the key
            const strippedKey = prefixBuffer ? keyBuffer.slice(prefixBuffer.length) : keyBuffer;
            chunk.key = isBuffer ? strippedKey : b4a.toString(strippedKey); // Update the key in the chunk
            chunk.prefix = prefix;
            // Emit the transformed chunk
            cb(null, chunk);
        }
    });

    return stream.pipe(transform); // Pipe the stream through the transform
}