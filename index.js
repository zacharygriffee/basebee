import Autobase from 'autobase';
import Hyperbee from 'hyperbee';
import b4a from 'b4a';
import c from 'compact-encoding'; // For binary encoding
import hypercoreId from 'hypercore-id-encoding'; // Import hypercore-id-encoding for writer key encoding
import delegates from "delegates";
import { opEncoding } from "./lib/opEncoding.js";
import { keyEncoder, timeStampEncoder } from "./lib/keyEncoders.js";
import { getPropFromMultipleObjects } from "./lib/getPropFromMultipleObjects.js";
import { Transform } from 'streamx'; // Streamx Transform

// Transform function to handle prefix removal and filtering
function createPrefixFilteringStream(prefix, stream) {
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

function applyPrefixToRange(range, prefix) {
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




export class Basebee {
    constructor(store, key, config) {
        if (key && !b4a.isBuffer(key) && typeof key !== "string" && typeof key === "object") {
            config = key;
            key = undefined;
        }
        config ||= {};
        config.name ||= "auto-db";
        if (config.prefix === null || config.prefix === "") config.prefix = null;
        else config.prefix ??= "main";
        this._useConflictStrategy = config?.useConflictStrategy ?? true;
        this._config = config;
        this.autobase = new Autobase(...[store, key].filter(o => !!o), {
            valueEncoding: opEncoding,
            open: this.openView.bind(this),
            apply: this.applyChanges.bind(this)
        });
        delegates(this, "autobase")
            .method("update");
        this._activeStreams = [];  // Keep track of active streams
    }

    _trackStream(stream) {
        this._activeStreams.push(stream);
        stream.on('close', () => {
            this._activeStreams = this._activeStreams.filter(s => s !== stream);
        });
        return stream;
    }

    openView(store) {
        const core = store.get({ name: this._config.name });
        const bee = new Hyperbee(core, {
            extension: false,
            metadata: c.encode(c.json, this._config.prefix)
        });

        delegates(this, "autobase")
            .getter("view");

        delegates(this, "view")
            .method("snapshot")
            .method("getHeader")
            .getter("key")
            .getter("discoveryKey")
            .getter("writable")
            .getter("readable");

        return bee;
    }

    // Apply the transform to filter and strip prefixes for readable streams
    createReadStream(options = {}) {
        const preparedOptions = prepareOptions(null, options, this._config);
        const prefixedRange = applyPrefixToRange(preparedOptions, preparedOptions.prefix);

        console.log("Prepared options:", preparedOptions);
        console.log("Prefixed range:", prefixedRange);

        const baseStream = this.view.createReadStream({
            ...preparedOptions,
            ...prefixedRange
        });

        return this._trackStream(createPrefixFilteringStream(preparedOptions.prefix, baseStream));
    }

    peek(range = {}, options = {}) {
        const preparedOptions = prepareOptions(range, options, this._config);

        // Apply prefix to the range options
        const prefixedRange = applyPrefixToRange(range, preparedOptions.prefix);

        const baseStream = this.view.peek(prefixedRange);
        return createPrefixFilteringStream(preparedOptions.prefix, baseStream);
    }

    createHistoryStream(options = {}) {
        const preparedOptions = prepareOptions(null, options, this._config);
        const prefixedRange = applyPrefixToRange(preparedOptions, preparedOptions.prefix);

        // Create the base stream with the prefixed range
        const baseStream = this.view.createHistoryStream({
            ...preparedOptions,
            ...prefixedRange
        });

        // Apply prefix filtering
        return this._trackStream(createPrefixFilteringStream(preparedOptions.prefix, baseStream));
    }

    createDiffStream(options = {}) {
        const preparedOptions = prepareOptions(null, options, this._config);
        const prefixedRange = applyPrefixToRange(preparedOptions, preparedOptions.prefix);

        // Create the base stream with the prefixed range
        const baseStream = this.view.createDiffStream({
            ...preparedOptions,
            ...prefixedRange
        });

        // Apply prefix filtering
        return this._trackStream(createPrefixFilteringStream(preparedOptions.prefix, baseStream));
    }


    watch(options = {}) {
        const preparedOptions = prepareOptions(null, options, this._config);
        const prefixedRange = applyPrefixToRange(preparedOptions, preparedOptions.prefix);

        // Create the base watch stream with the prefixed range
        const baseStream = this.view.watch({
            ...preparedOptions,
            ...prefixedRange
        });

        // Apply prefix filtering
        return this._trackStream(createPrefixFilteringStream(preparedOptions.prefix, baseStream));
    }


    getBySeq(seq, options = {}) {
        const preparedOptions = prepareOptions(null, options, this._config);
        return this.view.getBySeq(seq, preparedOptions);
    }

    async ready() {
        await this.autobase.ready();
    }

    async put(key, value, options = {}) {
        const asBatch = options?.asBatch;
        let _valueBuf, _keyBuf;
        const timestamp = Date.now();
        try {
            const preparedOptions = prepareOptions(null, options, this._config);
            _valueBuf = encodeValue(value, preparedOptions, this._config);
            _keyBuf = encodeKey(preparedOptions.prefix, key, preparedOptions);
        } catch (e) {
            // console.error('Error during put operation:', e);
            return;
        }

        const op = {
            key: b4a.from(_keyBuf),
            value: b4a.from(_valueBuf),
            timestamp,
            op: "put"
        };

        if (asBatch) {
            // Return the operation for batch handling
            return op;
        } else {
            // If not batch, append directly to autobase
            await this.autobase.append(op, { valueEncoding: opEncoding });
        }
    }

    async _put(change, view) {
        const { key, value, timestamp } = change;
        if (this._useConflictStrategy) {
            const encodedTimestampKey = c.encode(timeStampEncoder, key);
            const encodedTimestamp = c.encode(c.uint64, timestamp);
            await view.put(encodedTimestampKey, encodedTimestamp);
        }

        await view.put(key, value);
    }

    async del(key, options = {}) {
        const asBatch = options?.asBatch;
        const timestamp = Date.now();
        let _keyBuf;

        try {
            const preparedOptions = prepareOptions(null, options, this._config);
            _keyBuf = encodeKey(preparedOptions.prefix, key, preparedOptions);
        } catch (e) {
            console.error('Error during delete operation:', e);
            return;
        }

        const op = {
            key: b4a.from(_keyBuf),
            timestamp,
            op: "del"
        };

        if (asBatch) {
            // Return the delete operation for batch handling
            return op;
        } else {
            // If not batch, append directly to autobase
            await this.autobase.append(op, { valueEncoding: opEncoding });
        }
    }

    async _del(delOp, view) {
        await view.del(delOp.key);
    }

    async get(key, config = {}) {
        try {
            const preparedOptions = prepareOptions(null, config, this._config);
            const keyBuf = encodeKey(preparedOptions.prefix, key, preparedOptions);
            const { keyEncoding, ...restOptions } = preparedOptions;
            const node = await this.autobase.view.get(keyBuf, restOptions);

            if (!node?.value) {
                return null;
            }

            return {
                value: node.value,
                seq: node.seq,
                key,
                prefix: preparedOptions.prefix
            };
        } catch (e) {
            console.error('Failed to get key:', e);
            return null;
        }
    }

    async applyChanges(nodes, view) {
        for (const { value: rawValue } of nodes) {
            let ops = [];
            let to = view;

            if (rawValue?.op === "bch" && Array.isArray(rawValue.ops)) {
                ops = rawValue.ops;
                to = view.batch();
            } else {
                ops = [rawValue];
            }

            for (const operation of ops) {
                if (operation.op === 'add') {
                    await this.autobase.addWriter(hypercoreId.decode(operation.key), {indexer: operation.index});
                } else if (operation.op === 'rmv') {
                    await this.autobase.removeWriter(hypercoreId.decode(operation.key));
                } else if (operation.op === 'put') {
                    await this._put(operation, to);
                } else if (operation.op === 'del') {
                    await this._del(operation, to);
                }
            }

            if (rawValue?.op === "bch") {
                await to.flush();  // Ensure batch writes are committed
            }
        }
    }

    // Method to add a writer, now takes a buffer as input
    async addWriter(writerKey, index = false, options = {}) {
        const asBatch = options?.asBatch;
        const encodedWriterKey = hypercoreId.encode(writerKey);

        const op = {
            op: "add",
            key: encodedWriterKey,
            index
        };

        if (asBatch) {
            // Return the addWriter operation for batch handling
            return op;
        } else {
            // If not batch, append directly to autobase
            await this.autobase.append(op, { valueEncoding: opEncoding });
        }
    }

    // Method to remove a writer, takes a buffer as input
    async removeWriter(writerKey, options = {}) {
        const asBatch = options?.asBatch;
        const encodedWriterKey = hypercoreId.encode(writerKey);

        const op = {
            op: "rmv",
            key: encodedWriterKey
        };

        if (asBatch) {
            // Return the removeWriter operation for batch handling
            return op;
        } else {
            // If not batch, append directly to autobase
            await this.autobase.append(op, { valueEncoding: opEncoding });
        }
    }

    batch() {
        const batch = [];
        const to = this.autobase;

        return {
            put: async (key, value, options) => {
                const op = await this.put(key, value, { ...options, asBatch: true });
                batch.push(op);
            },

            del: async (key, options) => {
                const op = await this.del(key, { ...options, asBatch: true });
                batch.push(op);
            },

            addWriter: async (writerKey, index = false) => {
                const encodedWriterKey = hypercoreId.encode(writerKey);
                batch.push({
                    op: "add",
                    key: encodedWriterKey,
                    index
                });
            },

            removeWriter: async (writerKey) => {
                const encodedWriterKey = hypercoreId.encode(writerKey);
                batch.push({
                    op: "rmv",
                    key: encodedWriterKey
                });
            },

            async flush() {
                if (batch.length === 0) return;
                await to.append({
                    op: "bch",  // Denote it's a batch operation
                    ops: batch,
                    key: b4a.alloc(0)
                }, { valueEncoding: opEncoding });

                // Clear the batch after flush
                batch.length = 0;
            }
        };
    }

    // Close method to clean up resources
    async close() {
        await this.autobase.close();  // Close Autobase (if it has a close method)
        if (this.view) await this.view.close();
        for (const stream of this._activeStreams) {
            if (!stream.destroyed) {
                stream.destroy();
            }
        }
        this._activeStreams = [];
    }
}

function prepareOptions(rangeOrKey, options, config) {
    const _opts = { ...(rangeOrKey || {}), ...(config || {}), ...(options || {}) };

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

function encodeKey(prefix, key, ...configs) {
    const keyEncoding = c.from(getPropFromMultipleObjects("keyEncoding", ...configs) || c.binary);

    const enc = prefix
        ? c.from(keyEncoder.sub(prefix, keyEncoding))  // Apply sub-encoder if prefix is provided
        : keyEncoding;  // Use regular encoding if no prefix

    return c.encode(enc, key);
}

function encodeValue(value, ...configs) {
    if (b4a.isBuffer(value)) return value;
    const enc = c.from(getPropFromMultipleObjects("valueEncoding", ...configs) || c.binary);
    return c.encode(enc, value);
}

export default Basebee;
