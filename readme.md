# Basebee

### **Version:** 0.0.1-alpha

**Basebee** is a flexible key-value store built on top of [Autobase](https://github.com/holepunchto/autobase) and [Hyperbee](https://github.com/hypercore-protocol/hyperbee), designed for efficient data management with custom key/value encodings, prefix-based key organization, batch operations, and a stream-based API.

> **Note:** This is an **alpha** release (v0.0.1). It is not yet stable, and additional testing is required before it is officially released.

---

### Key Features
- **Custom Key/Value Encodings**: Supports multiple encodings such as JSON, binary, or user-defined formats.
- **Prefix-Based Key Management**: Organize and filter keys using prefixes for efficient querying and partitioning of data.
- **Batch Operations**: Perform atomic batch operations such as `put`, `del`, `addWriter`, and `removeWriter`.
- **Stream-Based API**: Supports real-time data streaming, history tracking, and efficient range queries.
- **Multi-Writer Support**: Easily manage contributions from multiple writers.

### Status
- **Current Version**: `0.0.1-alpha`
- This is a **pre-release** version under development. There are still **tests to be conducted** and a few adjustments needed for stability. Please proceed with caution if testing or integrating this version into your project.

### Getting Started

Once Basebee is officially released, detailed installation instructions and usage examples will be provided.

---

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
- [ ] Additional test cases (currently being worked on)
- [ ] Stability improvements
- [ ] Official release

---

### Contributing

Feel free to open issues or submit pull requests to help improve Basebee. Your contributions and feedback are always appreciated.

### License

Basebee is licensed under the [MIT License](LICENSE).

---

**Note:** This alpha version is not intended for production use.
