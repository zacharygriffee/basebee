import {keyEncoder} from "./keyEncoders.js";

export function applyPrefixToRange(range, prefix) {
    const prefixedRange = {};

    if (!prefix) {
        // No prefix provided, return the range as is
        return range;
    }

    const prefixEncoder = keyEncoder.sub(prefix);

    if (range.gt) prefixedRange.gt = prefixEncoder.encode(range.gt);
    if (range.gte) prefixedRange.gte = prefixEncoder.encode(range.gte);
    if (range.lt) prefixedRange.lt = prefixEncoder.encode(range.lt);
    if (range.lte) prefixedRange.lte = prefixEncoder.encode(range.lte);

    return prefixedRange;
}