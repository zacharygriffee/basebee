import {Autobase, Hyperbee, hypercoreId} from "./lib/prebundles/from-cjs.js";
import b4a from 'b4a';
import c from 'compact-encoding'; // For binary encoding
import delegates from "delegates";
import {opEncoding} from "./lib/opEncoding.js";
import {encodeKey, timeStampEncoder} from "./lib/keyEncoders.js";
import {createPrefixFilteringStream} from "./lib/createPrefixFilteringStream.js";
import {applyPrefixToRange} from "./lib/applyPrefixToRange.js";
import {prepareOptions} from "./lib/prepareOptions.js";
import {encodeValue} from "./lib/encodeValue.js";
import EventEmitter from "tiny-emitter";
import {forwardEvents} from "./lib/forwardEvents.js";

export class Basebee extends EventEmitter {
    constructor(store, key, config) {
        super();
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
        this._offListeners = [];
        this.autobase = new Autobase(...[store, key].filter(o => !!o), {
            valueEncoding: opEncoding,
            open: this.openView.bind(this),
            apply: this.applyChanges.bind(this)
        });

        this._offListeners.push(
            forwardEvents(
                this.autobase, this, [
                    "error",
                    "reindexing",
                    "interrupt",
                    "is-indexer",
                    "is-non-indexer",
                    "unwritable",
                    "writable",
                    "update",
                    "upgrade-available",
                    "fast-forward",
                    "warning"
                ]
            )
        );

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
        const core = store.get({name: this._config.name});
        const {
            keyEncoding,
            valueEncoding,
            name, prefix,
            ...restOpts
        } = this._config;
        const bee = new Hyperbee(core, {
            extension: false,
            ...restOpts,
            metadata: c.encode(c.json, {
                prefix: this._config.prefix
            })
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

        this._offListeners.push(
            forwardEvents(
                bee, this, [
                    "append",
                    "truncate",
                    "error",
                    "update"
                ]
            )
        );

        return bee;
    }

    // Apply the transform to filter and strip prefixes for readable streams
    createReadStream(options = {}) {
        const preparedOptions = prepareOptions(null, options, this._config);
        const prefixedRange = applyPrefixToRange(preparedOptions, preparedOptions.prefix);
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
        const staged = options?.staged;
        let _valueBuf, _keyBuf;
        const timestamp = Date.now();
        try {
            const preparedOptions = prepareOptions(null, options, this._config);
            _valueBuf = encodeValue(value, preparedOptions, this._config);
            _keyBuf = encodeKey(preparedOptions.prefix, key, preparedOptions);
        } catch (e) {
            this.emit('error', e, { operation: 'put', key });
            throw e;  // Ensure error is propagated
        }

        const op = { key: b4a.from(_keyBuf), value: b4a.from(_valueBuf), timestamp, op: "put" };

        if (staged) return op;
        await this.autobase.append(op, { valueEncoding: opEncoding });
    }

    async _put(change, view) {
        const {key, value, timestamp} = change;
        if (this._useConflictStrategy) {
            const encodedTimestampKey = c.encode(timeStampEncoder, key);
            const encodedTimestamp = c.encode(c.uint64, timestamp);
            await view.put(encodedTimestampKey, encodedTimestamp);
        }

        await view.put(key, value);
    }

    async del(key, options = {}) {
        const staged = options?.staged;
        const timestamp = Date.now();
        let _keyBuf;

        try {
            const preparedOptions = prepareOptions(null, options, this._config);
            _keyBuf = encodeKey(preparedOptions.prefix, key, preparedOptions);
        } catch (e) {
            this.emit('error', e, { operation: 'del', key });
            throw e;  // Ensure error is propagated
        }

        const op = { key: b4a.from(_keyBuf), timestamp, op: "del" };

        if (staged) return op;
        return this.autobase.append(op, { valueEncoding: opEncoding });
    }


    async _del(delOp, view) {
        await view.del(delOp.key);
    }

    async get(key, config = {}) {
        try {
            const preparedOptions = prepareOptions(null, config, this._config);
            const keyBuf = encodeKey(preparedOptions.prefix, key, preparedOptions);
            const {keyEncoding, ...restOptions} = preparedOptions;
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
        for (const {value: rawValue} of nodes) {
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
        const staged = options?.staged;
        const encodedWriterKey = hypercoreId.encode(writerKey);

        const op = {
            op: "add",
            key: encodedWriterKey,
            index
        };

        if (staged) {
            // Return the addWriter operation for batch handling
            return op;
        } else {
            // If not batch, append directly to autobase
            await this.autobase.append(op, {valueEncoding: opEncoding});
        }
    }

    // Method to remove a writer, takes a buffer as input
    async removeWriter(writerKey, options = {}) {
        const staged = options?.staged;
        const encodedWriterKey = hypercoreId.encode(writerKey);

        const op = {
            op: "rmv",
            key: encodedWriterKey
        };

        if (staged) {
            // Return the removeWriter operation for batch handling
            return op;
        } else {
            // If not batch, append directly to autobase
            await this.autobase.append(op, {valueEncoding: opEncoding});
        }
    }

    batch() {
        const batch = [];
        const to = this.autobase;

        return {
            put: async (key, value, options) => {
                const op = await this.put(key, value, {...options, staged: true});
                batch.push(op);
            },

            del: async (key, options) => {
                const op = await this.del(key, {...options, staged: true});
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
                }, {valueEncoding: opEncoding});

                // Clear the batch after flush
                batch.length = 0;
            }
        };
    }

    // Close method to clean up resources
    async close() {
        this._offListeners.forEach(o => o());
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

export default Basebee;
