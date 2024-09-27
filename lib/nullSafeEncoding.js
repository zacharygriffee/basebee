import b4a from "b4a";
import c from "compact-encoding";

export function nullSafeEncoding(innerEncoding) {
    if (!innerEncoding) innerEncoding = c.binary;
    innerEncoding = c.from(innerEncoding);
    return {
        preencode(state, value) {
            if (value === null) {
                // Encode null as an empty buffer (or any other representation you prefer)
                c.binary.preencode(state, b4a.alloc(0));
            } else {
                // Delegate to the actual encoding for non-null values
                innerEncoding.preencode(state, value);
            }
        },
        encode(state, value) {
            if (value === null) {
                // Encode null as an empty buffer
                c.binary.encode(state, b4a.alloc(0));
            } else {
                innerEncoding.encode(state, value);
            }
        },
        decode(state) {
            const decoded = innerEncoding.decode(state);
            // If decoding results in an empty buffer, interpret it as null
            if (b4a.isBuffer(decoded) && decoded.length === 0) {
                return null;
            }
            return decoded;
        }
    }
}
