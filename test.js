import {test, solo, skip} from 'brittle';
import Corestore from 'corestore';
import Hyperbee from "hyperbee";
import NotSecretStream from "not-secret-stream";
import duplexThrough from "duplex-through";
import RAM from 'random-access-memory';
import b4a from 'b4a';
import { Basebee } from './index.js';
import c from "compact-encoding";
import SubEncoder from "sub-encoder";

test('Basebee: close destroys all active streams', async (t) => {
    const store = new Corestore(RAM);
    const autobee = new Basebee(store);

    await autobee.ready();

    const stream = autobee.createReadStream();

    // Ensure the stream is still active before close
    t.ok(autobee._activeStreams.length === 1, 'Stream should be active');

    await autobee.close();

    // Ensure the stream has been destroyed after close
    t.ok(autobee._activeStreams.length === 0, 'All streams should be destroyed after close');
});

test('Basebee: store and retrieve data with buffer keys and JSON values, using hypercore-id-encoding for writers', async t => {
    const store = new Corestore(RAM);

    // Create Basebee instance with JSON encoding for values
    const autobee = new Basebee(store, { valueEncoding: c.json });

    // Ensure Basebee is ready
    await autobee.ready();

    // Add data to the Basebee instance with JSON encoding for the value
    const key = b4a.from('buffer-key');
    const value = { value: 'hello from autobase' };  // JSON object to be encoded
    await autobee.put(key, value);

    // Retrieve data from Basebee with metadata
    const node = await autobee.get(key);
    t.alike(node.value, { value: 'hello from autobase' });
    t.ok(node.seq, 'Sequence number exists in metadata');

    // Simulate adding and removing a writer
    const writerKey = b4a.alloc(32);  // Example buffer key
    await autobee.addWriter(writerKey, true);
    await autobee.removeWriter(writerKey);
    t.pass('Writer added and removed without errors.');

    // Close resources
    await autobee.close();
});

test('Basebee: conflict resolution (Last Write Wins) with JSON valueEncoding', async (t) => {
    const store = new Corestore(RAM);

    // Create Basebee instance with JSON encoding for values
    const autobee = new Basebee(store, { useConflictStrategy: true, valueEncoding: c.json });

    // Ensure Basebee is ready
    await autobee.ready();

    const key = b4a.from('conflict-key');

    // First write with an earlier timestamp
    await autobee.put(key, { value: 'initial-value' });

    // Simulate a delay for testing LWW
    await new Promise(resolve => setTimeout(resolve, 10));

    // Second write with a more recent timestamp
    await autobee.put(key, { value: 'newer-value' });

    // Get the current value (should be 'newer-value' due to LWW)
    const result = await autobee.get(key);
    t.alike(result.value, { value: 'newer-value' }, 'Last write should win');

    // Now simulate another write with an earlier timestamp, manually
    const earlierTimestamp = Date.now() - 1000; // Set to a time 1 second in the past
    await autobee.autobase.append({
        key,
        value: c.encode(c.json, { value: 'older-value' }),  // Follow the new structure for value
        timestamp: earlierTimestamp
    });

    // Fetch the value again (should still be 'newer-value' because LWW logic rejects older timestamps)
    const finalResult = await autobee.get(key);
    t.alike(finalResult.value, { value: 'newer-value' }, 'Older write should be ignored');

    // Close resources
    await autobee.close();
});

test('Basebee: handle multiple writers with conflict resolution', async (t) => {
    const store = new Corestore(RAM);
    const autobee = new Basebee(store, { valueEncoding: c.json });

    await autobee.ready();

    const key = b4a.from('shared-key');

    // Writer 1 writes a value
    const writer1Key = b4a.alloc(32);  // Example buffer key for writer 1
    await autobee.addWriter(writer1Key, true);
    await autobee.put(key, { value: 'writer1-value' });

    // Simulate a delay
    await new Promise(resolve => setTimeout(resolve, 10));

    // Writer 2 writes a different value
    const writer2Key = b4a.alloc(32);  // Example buffer key for writer 2
    await autobee.addWriter(writer2Key, true);
    await autobee.put(key, { value: 'writer2-value' });

    // Ensure the conflict is resolved and the latest value wins
    const result = await autobee.get(key);
    t.alike(result.value, { value: 'writer2-value' }, 'Writer 2 value should win');

    await autobee.close();
});

test('Basebee: retrieving non-existent key should return null', async (t) => {
    const store = new Corestore(RAM);
    const autobee = new Basebee(store, { valueEncoding: c.json });

    await autobee.ready();

    const nonExistentKey = b4a.from('non-existent-key');

    // Attempt to retrieve a key that doesn't exist
    const result = await autobee.get(nonExistentKey);
    t.is(result, null, 'Non-existent key should return null');

    await autobee.close();
});

test('Basebee: removing a writer', async (t) => {
    const store = new Corestore(RAM);
    const autobee = new Basebee(store, { valueEncoding: c.json });

    await autobee.ready();

    const key = b4a.from('key-to-remove');
    const writerKey = b4a.alloc(32);  // Example buffer key for writer

    // Add writer and insert data
    await autobee.addWriter(writerKey, true);
    await autobee.put(key, { value: 'some-value' });

    // Remove writer
    await autobee.removeWriter(writerKey);

    // Try to retrieve the value (it should still exist because removal doesn't delete the data)
    const result = await autobee.get(key);
    t.alike(result.value, { value: 'some-value' }, 'Value should still exist after writer removal');

    await autobee.close();
});


test('Basebee: simultaneous reads and writes', async (t) => {
    const store = new Corestore(RAM);
    const autobee = new Basebee(store, { valueEncoding: c.json });

    await autobee.ready();

    const key1 = b4a.from('key1');
    const key2 = b4a.from('key2');

    // Simulate simultaneous write and read
    await Promise.all([
        autobee.put(key1, { value: 'value1' }),
        autobee.put(key2, { value: 'value2' }),
        autobee.get(key1),
        autobee.get(key2)
    ]);

    // Retrieve both values to ensure they were written correctly
    const result1 = await autobee.get(key1);
    const result2 = await autobee.get(key2);

    t.alike(result1.value, { value: 'value1' }, 'Key1 should store value1');
    t.alike(result2.value, { value: 'value2' }, 'Key2 should store value2');

    await autobee.close();
});


test('Basebee: get encodings that result in error return null', async (t) => {
    const store = new Corestore(RAM);
    const autobee = new Basebee(store, { valueEncoding: c.json });

    await autobee.ready();

    // Intentionally store a buffer that can't be decoded as JSON
    const key = b4a.from('corrupted-key');
    const corruptedValue = b4a.from('invalid-binary-data');

    await autobee.autobase.append({
        key,
        value: corruptedValue,
        timestamp: Date.now()
    });

    // Attempt to get the corrupted value
    const result = await autobee.get(key);

    // Check that the failure is handled gracefully and the error is logged or returned
    t.is(result, null, 'Should return null or error object on decoding failure');

    await autobee.close();
});

test('Basebee: handle del after put from different peers with Last Write Wins', async (t) => {
    const store = new Corestore(RAM);
    const autobee = new Basebee(store, { valueEncoding: c.json, useConflictStrategy: true });

    await autobee.ready();

    const key = b4a.from('key1');

    // First, peer 1 inserts a value for the key
    await autobee.put(key, { value: 'initial-value' });

    // Simulate a peer-to-peer update
    await autobee.update();

    // Then, peer 2 deletes the key
    await autobee.del(key);

    // Simulate another peer-to-peer update
    await autobee.update();

    // Retrieve the value after the conflict
    const result = await autobee.get(key);

    // Assert that the del operation overwrites the put operation
    t.is(result, null, 'Del should win and key should not exist');

    await autobee.close();
});

test('Basebee: handle del after put from different peers with Last Write Wins', async (t) => {
    const store = new Corestore(RAM);
    const autobee = new Basebee(store, { valueEncoding: c.json });

    await autobee.ready();

    const key = b4a.from('key1');

    // First, peer 1 inserts a value for the key
    await autobee.put(key, { value: 'initial-value' });

    // Simulate a peer-to-peer update
    await autobee.update();

    // Then, peer 2 deletes the key
    await autobee.del(key);

    // Simulate another peer-to-peer update
    await autobee.update();

    // Retrieve the value after the conflict
    const result = await autobee.get(key);

    // Assert that the del operation overwrites the put operation
    t.is(result, null, 'Del should win and key should not exist');

    await autobee.close();
});

test('Basebee: handle del with useConflictStrategy and prefix', async (t) => {
    const store = new Corestore(RAM);
    const autobee = new Basebee(store, {
        useConflictStrategy: true,
        keyEncoding: 'utf-8',
        valueEncoding: "json",
        prefix: 'main'
    });

    await autobee.ready();

    // Insert a key
    await autobee.put('key1', { value: 'some-value' });

    // Verify the value exists
    let node = await autobee.get('key1');
    t.alike(node.value, { value: 'some-value' }, 'Value should be present');

    // Delete the key
    await autobee.del('key1');

    // Verify the key is deleted
    node = await autobee.get('key1');
    t.is(node, null, 'Key should be deleted');

    await autobee.close();
});

test('Basebee: delegates methods and properties', async (t) => {
    const store = new Corestore(RAM);
    const autobee = new Basebee(store);

    await autobee.ready();

    // Test delegated properties
    t.ok(autobee.key, 'Key should be available through delegation');
    t.ok(autobee.discoveryKey, 'Discovery key should be available through delegation');

    // Test delegated methods for view
    t.is(typeof autobee.createHistoryStream, 'function', 'createHistoryStream should be a delegated method');
    t.is(typeof autobee.peek, 'function', 'peek should be a delegated method');
    t.is(typeof autobee.createReadStream, 'function', 'createReadStream should be a delegated method');
    t.is(typeof autobee.batch, 'function', 'batch should be a delegated method');
    t.is(typeof autobee.getBySeq, 'function', 'getBySeq should be a delegated method');

    // Test delegated method for autobase
    t.is(typeof autobee.update, 'function', 'update should be a delegated method');

    await autobee.close();
});

// test('Basebee: create read stream', async (t) => {
//     const store = new Corestore(RAM);
//     const autobee = new Basebee(store);
//
//     await autobee.ready();
//
//     // Test delegated properties
//     t.ok(autobee.key, 'Key should be available through delegation');
//     t.ok(autobee.discoveryKey, 'Discovery key should be available through delegation');
//
//     // Test delegated methods for view
//     t.is(typeof autobee.createHistoryStream, 'function', 'createHistoryStream should be a delegated method');
//     t.is(typeof autobee.peek, 'function', 'peek should be a delegated method');
//     t.is(typeof autobee.createReadStream, 'function', 'createReadStream should be a delegated method');
//     t.is(typeof autobee.batch, 'function', 'batch should be a delegated method');
//     t.is(typeof autobee.getBySeq, 'function', 'getBySeq should be a delegated method');
//
//     // Test delegated method for autobase
//     t.is(typeof autobee.update, 'function', 'update should be a delegated method');
//
//     await autobee.close();
// });

test("Hyperbee can use the basebee view remotely", async t => {
    const [s1, s2] = await Promise.all(duplexThrough().map(d => createStore(d)));

    const auto = new Basebee(s1, {
        valueEncoding: "utf-8",
        keyEncoding: "utf-8",
        rootKey: "main"
    });
    await auto.ready();
    const autoKey = auto.view.key;
    await auto.put("hello", "world");
    const expectedResult = await auto.get("hello");

    await auto.update({wait: true});

    const norm = new Hyperbee(s2.get({key: autoKey}), {
        valueEncoding: "utf-8",
        keyEncoding: new SubEncoder("main", "utf-8")
    });

    await norm.ready();
    await norm.update({wait: true});
    console.log(norm.core.length);
    const result = await norm.get("hello");

    t.alike({...result, prefix: "main"}, expectedResult);

    async function createStore(dup) {
        const nss = new NotSecretStream(dup);
        const store = new Corestore(RAM);
        store.replicate(nss);
        await store.ready();
        return store;
    }

    t.teardown(() => auto.close());
});

test('Basebee: out of bounds iterator', async function (t) {
    const store = new Corestore(RAM);
    const basebee = new Basebee(store, {useConflictStrategy: false, prefix: null});

    await basebee.ready();

    const b = basebee;

    await b.put(b4a.from('a'), null);
    await b.put(b4a.from('b'), null);
    await b.put(b4a.from('c'), null);

    const s = basebee.createReadStream({ gt: b4a.from('c') });
    let count = 0;

    s.on('data', function (data) {
        count++;
    });
    t.teardown(() => basebee.close());

    return new Promise(resolve => {
        s.on('end', function () {
            t.is(count, 0, 'no out of bounds reads');
            resolve();
        });
    });
});

test('createHistoryStream reverse', async function (t) {
    const store = new Corestore(RAM);
    const b = new Basebee(store, {
        keyEncoding: "utf-8",
        prefix: null,
        useConflictStrategy: false
    });

    await b.put('a', null)
    await b.put('b', null)
    await b.put('c', null)

    const s = b.createHistoryStream({ reverse: true })

    let res = ''
    s.on('data', function (data) {
        const { key } = data
        res += key
    })

    return new Promise(resolve => {
        s.on('end', function () {
            t.is(res, 'cba', 'reversed correctly')
            resolve()
        })
    })
    t.teardown(() => b.close());
})

skip('test all short iterators', async function (t) {
    const store = new Corestore(RAM);
    const db = new Basebee(store, {
        valueEncoding: "utf-8",
        keyEncoding: "utf-8",
        prefix: null
    });

    const MAX = 25

    for (let size = 1; size <= MAX; size++) {
        const reference = []
        for (let i = 0; i < size; i++) {
            const key = '' + i
            await db.put(key, 'hello world')
            reference.push(key)
        }
        reference.sort()

        for (let i = 0; i < size; i++) {
            for (let j = 0; j <= i; j++) {
                for (let k = 0; k < 8; k++) {
                    const greater = (k & 1) ? 'gte' : 'gt'
                    const lesser = (k >> 1 & 1) ? 'lte' : 'lt'
                    const reverse = !!(k >> 2 & 1)
                    const opts = {
                        [greater]: '' + j,
                        [lesser]: '' + i,
                        reverse
                    }
                    const entries = await collect(db.createReadStream(opts))
                    if (!validate(size, reference, opts, entries)) {
                        return
                    }
                }
            }
        }
    }

    t.pass('all iterations passed')

    function validate (size, reference, opts, entries) {
        const start = opts.gt ? reference.indexOf(opts.gt) + 1 : reference.indexOf(opts.gte)
        const end = opts.lt ? reference.indexOf(opts.lt) : reference.indexOf(opts.lte) + 1
        const range = reference.slice(start, end)
        if (opts.reverse) range.reverse()
        for (let i = 0; i < range.length; i++) {
            if (!entries[i] || range[i] !== entries[i].key) {
                console.log('========')
                console.log('SIZE:', size)
                console.log('FAILED WITH OPTS:', opts)
                console.log('  expected:', range, 'start:', start, 'end:', end)
                console.log('  actual:', entries.map(e => e.key))
                t.fail('ranges did not match')
                return false
            }
        }
        return true
    }
});

test('custom key/value encodings in get/put', async function (t) {
    const store = new Corestore(RAM);
    const db = new Basebee(store, {keyEncoding: "utf-8"});
    await db.put(b4a.from('hello'), b4a.from('world'), {
        keyEncoding: 'binary',
        valueEncoding: 'binary'
    })
    const node = await db.get(b4a.from('hello'), {
        keyEncoding: 'binary',
        valueEncoding: 'binary'
    })
    t.alike(node.key, b4a.from('hello'))
    t.alike(node.value, b4a.from('world'))
    t.teardown(() => db.close());
});

test('custom key/value encodings in range iterator', async function (t) {
    const store = new Corestore(RAM);
    const db = new Basebee(store, {
        keyEncoding: "utf-8",
        // A: explicitly set prefix null here
        // prefix: null,
        useConflictStrategy: false
    });
    await db.put(b4a.from('hello1'), b4a.from('world1'), {
        keyEncoding: 'binary',
        valueEncoding: 'binary',
        // B: or explicitly set prefix null here
        prefix: null
    })
    await db.put(b4a.from('hello2'), b4a.from('world2'), {
        keyEncoding: 'binary',
        valueEncoding: 'binary',
        // B: or explicitly set prefix null here
        prefix: null
    })

    const s = db.createReadStream({
        gt: b4a.from('hello1'),
        keyEncoding: 'binary',
        valueEncoding: 'binary',
        // B: and explicitly set prefix null here
        prefix: null
    })
    let count = 0
    let node = null

    s.on('data', function (data) {
        count++
        node = data
    })

    await new Promise(resolve => s.on('end', resolve))

    t.is(count, 1)
    t.alike(node.key, b4a.from('hello2'))
    t.alike(node.value, b4a.from('world2'))
    t.teardown(() => db.close());
});

test('get by seq', async function (t) {
    const store = new Corestore(RAM);
    const db = new Basebee(store, {
        valueEncoding: "utf-8",
        keyEncoding: "utf-8",
        // prefix: null,
        useConflictStrategy: false
    });

    await db.put('/a', '1', {prefix: null})
    await db.put('/b', '2', {prefix: null})

    t.alike(await db.getBySeq(1, {prefix: null}), { key: '/a', value: '1' })
    t.alike(await db.getBySeq(2, {prefix: null}), { key: '/b', value: '2' })
    t.teardown(() => db.close());
})

test('iterate over main prefix with useConflictStrategy=true and default prefix', async (t) => {
    const store = new Corestore(RAM);

    // Create Basebee instance with useConflictStrategy enabled and default prefix "main"
    const autobee = new Basebee(store, {
        prefix: "main",   // Default prefix for non-timestamp keys
        useConflictStrategy: true,
        valueEncoding: "utf-8",
        keyEncoding: "utf-8"
    });

    // Ensure Basebee is ready
    await autobee.ready();

    // Insert key-value pairs under the "main" prefix (with internal timestamps)
    await autobee.put('key1', 'value1');
    await autobee.put('key2', 'value2');

    // Update 'key1' with a new value to trigger conflict resolution logic (useConflictStrategy)
    await autobee.put('key1', 'updated-value1');

    // Iterate over the "main" prefix to check the values
    const readStream = autobee.createReadStream({ prefix: 'main' });

    let result = [];
    readStream.on('data', (data) => {
        result.push(data);
    });

    await new Promise((resolve) => readStream.on('end', resolve));

    // Verify the keys and values in the "main" prefix, ensuring conflict resolution worked
    t.is(result.length, 2, 'Should only contain 2 entries from the "main" prefix');
    t.alike(result[0].key, 'key1', 'First key should be key1');
    t.alike(result[0].value, 'updated-value1', 'Value for key1 should be the updated value');
    t.alike(result[1].key, 'key2', 'Second key should be key2');
    t.alike(result[1].value, 'value2', 'Value for key2 should be unchanged');

    // Now test that timestamps are applied behind the scenes correctly
    // We can't directly check the timestamps as they're internal, but we can check conflict resolution behavior

    // Close resources
    await autobee.close();

    t.teardown(() => autobee.close());
});

test('batch: multiple put operations', async (t) => {
    const store = new Corestore(RAM);
    const db = new Basebee(store, {
        valueEncoding: 'utf-8',
        keyEncoding: 'utf-8',
        prefix: null
    });

    await db.ready();

    // Create batch
    const batch = db.batch();

    // Add multiple put operations to the batch
    await batch.put('key1', 'value1');
    await batch.put('key2', 'value2');
    await batch.put('key3', 'value3');

    // Flush the batch
    await batch.flush();

    // Verify that the batch writes succeeded
    const entries = await collect(db.createReadStream({ gte: 'key1', lte: 'key3' }));

    t.is(entries.length, 3, 'Should have three entries in the range');
    t.alike(entries[0].key, 'key1');
    t.alike(entries[0].value, 'value1');
    t.alike(entries[1].key, 'key2');
    t.alike(entries[1].value, 'value2');
    t.alike(entries[2].key, 'key3');
    t.alike(entries[2].value, 'value3');
    t.teardown(() => db.close());
});

test('batch: multiple delete operations', async (t) => {
    const store = new Corestore(RAM);
    const db = new Basebee(store, {
        valueEncoding: 'utf-8',
        keyEncoding: 'utf-8',
        prefix: null
    });

    await db.ready();

    // Insert initial keys
    await db.put('key1', 'value1');
    await db.put('key2', 'value2');
    await db.put('key3', 'value3');

    // Create batch for delete operations
    const batch = db.batch();
    await batch.del('key1');
    await batch.del('key2');

    // Flush the batch
    await batch.flush();

    // Verify that the batch deletes succeeded
    const remainingEntries = await collect(db.createReadStream({ gte: 'key1', lte: 'key3' }));

    t.is(remainingEntries.length, 1, 'Should only have one remaining entry after deletes');
    t.alike(remainingEntries[0].key, 'key3');
    t.alike(remainingEntries[0].value, 'value3');
    t.teardown(() => db.close());
});

test('batch: mixed put and delete operations', async (t) => {
    const store = new Corestore(RAM);
    const db = new Basebee(store, {
        valueEncoding: 'utf-8',
        keyEncoding: 'utf-8',
        prefix: null
    });

    await db.ready();

    // Insert initial keys
    await db.put('key1', 'initial-value1');
    await db.put('key2', 'initial-value2');
    await db.put('key3', 'initial-value3');

    // Create a batch for mixed operations
    const batch = db.batch();
    await batch.put('key2', 'updated-value2');
    await batch.del('key3');
    await batch.put('key4', 'new-value4');

    // Flush the batch
    await batch.flush();

    // Verify that the mixed batch operations succeeded
    const entries = await collect(db.createReadStream({ gte: 'key1', lte: 'key4' }));

    t.is(entries.length, 3, 'Should have three entries after mixed operations');
    t.alike(entries[0].key, 'key1');
    t.alike(entries[0].value, 'initial-value1');
    t.alike(entries[1].key, 'key2');
    t.alike(entries[1].value, 'updated-value2');
    t.alike(entries[2].key, 'key4');
    t.alike(entries[2].value, 'new-value4');
    t.teardown(() => db.close());
});

test('batch: adding and removing writers', async (t) => {
    const store = new Corestore(RAM);
    const db = new Basebee(store, {
        valueEncoding: 'utf-8',
        keyEncoding: 'utf-8',
        prefix: null
    });

    await db.ready();

    // Create batch for adding/removing writers
    const batch = db.batch();

    // Add a writer
    const writerKey = b4a.alloc(32);
    await batch.addWriter(writerKey);

    // Remove the same writer
    await batch.removeWriter(writerKey);

    // Flush the batch
    await batch.flush();

    t.pass('Writer added and removed in batch without errors');
    t.teardown(() => db.close());
});

test('out of bounds iterator, string encoding', async function (t) {
    const store = new Corestore(RAM);
    const b = new Basebee(store, {
        keyEncoding: 'utf-8',
        valueEncoding: "utf-8"
    })

    await b.put('a', null)
    await b.put('b', null)
    await b.put('c', null)

    const s = b.createReadStream({ gte: 'f' })
    let count = 0

    s.on('data', function (data) {
        count++
    })

    return new Promise(resolve => {
        s.on('end', function () {
            t.is(count, 0, 'no out of bounds reads')
            resolve()
        })
    })
});

solo('out of bounds iterator, larger db', async function (t) {
    const store = new Corestore(RAM);
    const db = new Basebee(store, {
        keyEncoding: 'utf-8',
        valueEncoding: "utf-8",
        useConflictStrategy: false,
        // prefix: null
    })


    for (let i = 0; i < 8; i++) {
        await db.put('' + i, 'hello world')
    }

    const s = db.createReadStream({ gte: 'a' })
    let count = 0

    s.on('data', function (data) {
        count++
    })

    return new Promise(resolve => {
        s.on('end', function () {
            t.is(count, 0, 'no out of bounds reads')
            resolve()
        })
    })
});


function collect (stream) {
    return new Promise((resolve, reject) => {
        const entries = []
        let ended = false
        stream.on('data', d => entries.push(d))
        stream.on('error', err => reject(err))
        stream.on('end', () => { ended = true })
        stream.on('close', () => {
            if (ended) resolve(entries)
            else reject(new Error('Premature close'))
        })
    })
}