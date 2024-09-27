# Basebee

### alpha

**Basebee** is a flexible key-value store built on top of [Autobase](https://github.com/holepunchto/autobase) and [Hyperbee](https://github.com/hypercore-protocol/hyperbee), designed for efficient data management with custom key/value encodings, prefix-based key organization, batch operations, and a stream-based API.

> **Note:** This is an **alpha** release . It is not yet stable, and additional testing is required before it is officially released.

---

### Key Features
- **Custom Key/Value Encodings**: Supports multiple encodings such as JSON, binary, or user-defined formats.
- **Prefix-Based Key Management**: Organize and filter keys using prefixes for efficient querying and partitioning of data.
- **Batch Operations**: Perform atomic batch operations such as `put`, `del`, `addWriter`, and `removeWriter`.
- **Stream-Based API**: Supports real-time data streaming, history tracking, and efficient range queries.
- **Multi-Writer Support**: Easily manage contributions from multiple writers.
- **Conflict Resolution Strategies** Early adoption of conflict resolution strategy LWW, and plan to support more.

### Status
- **Current Version**: `0.0.1-alpha`
- This is a **pre-release** version under development. There are still **tests to be conducted** and a few adjustments needed for stability. Please proceed with caution if testing or integrating this version into your project.

### Getting Started

Once Basebee is officially released, detailed installation instructions and usage examples will be provided.

---

## Hyperbee vs Basebee
### Prefix Handling in Hyperbee vs Basebee

**Hyperbee**:
- In **Hyperbee**, keys are treated as-is, without any inherent concept of prefixes. When you insert or query data, the keys are compared lexicographically as binary data. If you want to implement a prefix system, you would have to do so manually by adding a prefix to your keys and handling prefix-based querying yourself.
- **Hyperbee** doesn't automatically apply prefixes or manage the separation of data by prefixes. It operates purely on the raw keys you provide.
- If you wish to add a namespace or segregate data using prefixes, you would need to manually prepend a prefix to the key when storing data and filter it by key range (e.g., `gte` or `lte`) when querying the data.
- **Key Encodings**: Hyperbee supports encoding keys, which allows you to store keys in different formats (e.g., `binary`, `utf-8`, etc.).

**Basebee**:
- **Basebee** introduces a more explicit and structured prefix system. Prefixes are an integral part of the design and can be defined at the time of the database's creation.
- **Basebee** handles prefixing automatically:
    - When you define a prefix, Basebee will automatically add it to your keys before inserting them into the underlying **Hyperbee** instance.
    - When querying data, Basebee will automatically filter and remove the prefix from the results. This simplifies the process of using namespaces or logical separations within the keyspace.
    - **Prefix-aware Querying**: Basebee applies prefixes to key-based queries (like `gte`, `lte`, etc.) automatically, so you don’t have to manually manage or filter them when querying the data.
- **Stream Filtering**: Basebee uses prefix-aware filtering streams (`createPrefixFilteringStream`) to ensure that only the keys within the specified prefix are retrieved when running queries.
- **Prefix** When using Basebee, there's no need to set a prefix. Basebee automatically manages its own internal keys for conflict resolution. If you disable conflict resolution (i.e., config.useConflictStrategy = false and config.prefix = null), Basebee behaves just like Hyperbee, but this comes with the risk of potential conflicts between writes

#### Example of Key Prefixing:

- **Hyperbee** (Manual Prefixing):
  ```js
  const prefix = 'main';
  const key = prefix + ':some-key';
  await hyperbee.put(key, value);
  const result = await hyperbee.get(key);
  ```

  Querying with manual range:
  ```js
  const prefix = 'main';
  const resultStream = hyperbee.createReadStream({
    gte: prefix + ':',
    lte: prefix + ':\xff'
  });
  ```

- **Basebee** (Automatic Prefixing):
  ```js
  const db = new Basebee(store, { prefix: 'main' });
  await db.put('some-key', value);
  const result = await db.get('some-key');
  ```

  Querying with automatic prefix handling:
  ```js
  const resultStream = db.createReadStream(); // Automatically handles prefix
  ```

### Other Key Differences

**Conflict Strategy**:
- **Hyperbee**: Hyperbee does not include built-in conflict resolution logic, as it is designed to operate with a single writer.
- **Basebee**: Basebee has an optional `useConflictStrategy` flag to handle write conflicts, typically by using a last-write-wins (LWW) strategy where the latest entry overwrites previous ones based on a timestamp.

**Batching**:
- Both Hyperbee and Basebee support batching writes.
- **Basebee**: Basebee wraps batch operations with Autobase functionality. Batching in Basebee is part of its `Autobase` workflow, which can include multiple writers.
- **Hyperbee**: Hyperbee supports simple batch operations, but without the additional layer of conflict resolution or multiple writers.

**Multiple Writers**:
- **Hyperbee**: Primarily designed for a single writer.
- **Basebee**: Integrates with **Autobase** for handling multiple writers, allowing decentralized writing to a shared dataset.

**Autobase Integration**:
- **Hyperbee**: No native support for Autobase or multiple writers. It’s a simple append-only B-tree key-value store.
- **Basebee**: Extends Hyperbee with Autobase, enabling the handling of multiple concurrent writers with conflict resolution.

**Streams and Read Options**:
- Both support streams (`createReadStream`, `createHistoryStream`, etc.), but **Basebee** automatically applies prefixes to these streams, filtering out irrelevant keys and simplifying access to specific namespaces.

    - **Hyperbee**: You need to manually manage filtering based on key ranges.
    - **Basebee**: Automatically applies prefix filtering based on the configuration provided.

**Metadata Handling**:
- **Hyperbee**: Metadata can be used to store additional context but needs to be managed manually.
- **Basebee**: The prefix itself is encoded in the metadata, which helps in identifying and segregating data across different namespaces. Plans for additional metadata options is in the future.

### Summary

- **Hyperbee** is a simple and powerful append-only B-tree key-value store with no built-in prefix management or multi-writer support. Prefixes need to be manually managed.
- **Basebee** builds on top of **Hyperbee** by adding automatic prefix management, multi-writer support via Autobase, conflict resolution strategies, and a simpler interface for querying and managing prefixed data.

If you are building a system that requires managing data across different namespaces or handling multiple writers with conflict resolution, **Basebee** abstracts a lot of the complexity, especially when it comes to prefix management.

### API Overview

#### `put(key, value, options)`
Insert a key-value pair into the store with the provided key encoding and value encoding.

#### `get(key, options)`
Retrieve a value by its key, with support for custom key and value encodings.

#### `del(key, options)`
Delete a key-value pair by its key.

#### `batch()`
Create a batch of operations, allowing multiple `put`, `del`, `addWriter`, and `removeWriter` calls to be committed in a single transaction.

#### Stream APIs
- `createReadStream(options)`: Stream key-value pairs over a specified range.
- `createHistoryStream(options)`: Stream historical changes to key-value pairs.
- `createDiffStream(options)`: Stream differences between states.
- `watch(options)`: Watch for real-time changes.

### Development Status & To-Do
- [x] Custom key/value encodings
- [x] Prefix-based key management
- [x] Batch operations
- [x] Stream API
- [x] Multi-writer support
- [ ] Create additional pluggable conflict strategies.
- [ ] Additional test cases (currently being worked on)
- [ ] Stability improvements
- [ ] Official release

---

### License

Basebee is licensed under the [MIT License](LICENSE).

---

**Note:** This alpha version is not intended for production use.
