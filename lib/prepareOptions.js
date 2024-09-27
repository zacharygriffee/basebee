import c from "compact-encoding";

export function prepareOptions(rangeOrKey, options, config) {
    const _opts = {...(rangeOrKey || {}), ...(config || {}), ...(options || {})};

    // Handle prefix: if options.prefix is undefined, fallback to config.prefix, otherwise null
    let prefix = options.prefix !== undefined
        ? options.prefix
        : (config.prefix !== undefined ? config.prefix : null);

    _opts.prefix = prefix;

    // For keyEncoding and valueEncoding, prioritize options, then fallback to config, and default to binary
    _opts.keyEncoding = options.keyEncoding || config.keyEncoding || c.binary;
    _opts.valueEncoding = options.valueEncoding || config.valueEncoding || c.binary;

    return _opts;
}