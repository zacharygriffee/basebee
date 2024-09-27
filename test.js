import { test, solo, skip } from 'brittle';
import Corestore from 'corestore';
import RAM from 'random-access-memory';
import b4a from 'b4a';
import { Basebee } from './index.js';
import c from 'compact-encoding';

function create(config = {}) {
    const store = new Corestore(RAM);
    const db = new Basebee(store, config);
    return { db, store };
}

test('Basebee: close destroys all active streams', async (t) => {
    const { db } = create();

    await db.ready();

    db.createReadStream();
    t.ok(db._activeStreams.length === 1, 'Stream should be active');
    await db.close();
    t.ok(db._activeStreams.length === 0, 'All streams should be destroyed after close');
});

test('cannot append to read-only db', async function (t) {
    const { db } = create({ readonly: true })
    await db.ready()
    await t.exception(() => db.put('hello', 'world'))
})

test('Basebee: store and retrieve data with buffer keys and JSON values', async (t) => {
    const { db } = create({ valueEncoding: c.json });

    await db.ready();

    const key = b4a.from('buffer-key');
    const value = { value: 'hello from autobase' };
    await db.put(key, value);

    const node = await db.get(key);
    t.alike(node.value, { value: 'hello from autobase' });
    t.ok(node.seq, 'Sequence number exists in metadata');

    await db.close();
});

test('Basebee: conflict resolution (Last Write Wins)', async (t) => {
    const { db } = create({ useConflictStrategy: true, valueEncoding: c.json });

    await db.ready();
    const key = b4a.from('conflict-key');

    await db.put(key, { value: 'initial-value' });
    await new Promise(resolve => setTimeout(resolve, 10));
    await db.put(key, { value: 'newer-value' });

    const result = await db.get(key);
    t.alike(result.value, { value: 'newer-value' }, 'Last write should win');

    await db.close();
});

test('Basebee: handle multiple writers with conflict resolution', async (t) => {
    const { db } = create({ valueEncoding: c.json });

    await db.ready();

    const key = b4a.from('shared-key');
    await db.put(key, { value: 'writer1-value' });
    await new Promise(resolve => setTimeout(resolve, 10));
    await db.put(key, { value: 'writer2-value' });

    const result = await db.get(key);
    t.alike(result.value, { value: 'writer2-value' }, 'Writer 2 value should win');

    await db.close();
});

test('Basebee: retrieving non-existent key should return null', async (t) => {
    const { db } = create({ valueEncoding: c.json });
    await db.ready();

    const nonExistentKey = b4a.from('non-existent-key');
    const result = await db.get(nonExistentKey);
    t.is(result, null, 'Non-existent key should return null');

    await db.close();
});

test('Basebee: removing a writer', async (t) => {
    const { db } = create({ valueEncoding: c.json });

    await db.ready();
    const key = b4a.from('key-to-remove');
    const writerKey = b4a.alloc(32);
    await db.put(key, { value: 'some-value' });
    await db.removeWriter(writerKey);

    const result = await db.get(key);
    t.alike(result.value, { value: 'some-value' }, 'Value should still exist after writer removal');

    await db.close();
});

test('Basebee: simultaneous reads and writes', async (t) => {
    const { db } = create({ valueEncoding: c.json });

    await db.ready();
    const key1 = b4a.from('key1');
    const key2 = b4a.from('key2');

    await Promise.all([db.put(key1, { value: 'value1' }), db.put(key2, { value: 'value2' })]);

    const result1 = await db.get(key1);
    const result2 = await db.get(key2);

    t.alike(result1.value, { value: 'value1' });
    t.alike(result2.value, { value: 'value2' });

    await db.close();
});

test('Basebee: should propagate error during del operation', async (t) => {
    const store = new Corestore(RAM);
    const autobee = new Basebee(store, { valueEncoding: 'utf-8' });

    await autobee.ready();

    // Simulate a deletion error by passing an invalid key (e.g., a string when the key is expected to be a buffer)
    const faultyKey = {};  // Invalid key type (object instead of string or buffer)

    let errorCaught = false;

    // Listen for the error event
    autobee.on('error', (err, context) => {
        errorCaught = true;
        t.ok(err, 'Error should be caught during del operation');
        t.is(context.operation, 'del', 'Operation context should be "del"');
        t.is(context.key, faultyKey, 'Context should contain the correct key');
    });

    // Perform a deletion and expect it to throw an error
    await t.exception(() => autobee.del(faultyKey), 'del operation should throw an error');

    // Ensure the error event was emitted
    t.ok(errorCaught, 'Error event should be emitted for del operation');

    // Close the resources
    await autobee.close();
});

test('Basebee: handle del with useConflictStrategy and prefix', async (t) => {
    const { db } = create({
        useConflictStrategy: true,
        keyEncoding: 'utf-8',
        valueEncoding: 'json',
        prefix: 'main',
    });

    await db.ready();
    await db.put('key1', { value: 'some-value' });

    let node = await db.get('key1');
    t.alike(node.value, { value: 'some-value' }, 'Value should be present');
    await db.del('key1');

    node = await db.get('key1');
    t.is(node, null, 'Key should be deleted');

    await db.close();
});

test('Basebee: custom key/value encodings in get/put', async (t) => {
    const { db } = create({ keyEncoding: 'utf-8' });

    await db.put(b4a.from('hello'), b4a.from('world'), {
        keyEncoding: 'binary',
        valueEncoding: 'binary',
    });

    const node = await db.get(b4a.from('hello'), {
        keyEncoding: 'binary',
        valueEncoding: 'binary',
    });

    t.alike(node.key, b4a.from('hello'));
    t.alike(node.value, b4a.from('world'));

    await db.close();
});

test('Basebee: out of bounds iterator, string encoding', async function (t) {
    const { db } = create({
        keyEncoding: 'utf-8',
        prefix: null,
        valueEncoding: 'utf-8'
    });
    await db.put('a', null);
    await db.put('b', null);
    await db.put('c', null);

    const s = db.createReadStream({ gte: 'f' });
    let count = 0;

    s.on('data', function (data) {
        count++;
    });

    await new Promise((resolve) => s.on('end', resolve));
    t.is(count, 0, 'No out-of-bounds reads');

    await db.close();
});

test('Basebee: out of bounds iterator, larger db', async function (t) {
    const { db } = create({
        keyEncoding: 'utf-8',
        valueEncoding: 'utf-8',
        useConflictStrategy: false,
    });

    for (let i = 0; i < 8; i++) {
        await db.put('' + i, 'hello world');
    }

    const s = db.createReadStream({ gte: 'a' });
    let count = 0;

    s.on('data', function (data) {
        count++;
    });

    await new Promise((resolve) => s.on('end', resolve));
    t.is(count, 0, 'No out-of-bounds reads');

    await db.close();
});

function collect(stream) {
    return new Promise((resolve, reject) => {
        const entries = [];
        stream.on('data', (d) => entries.push(d));
        stream.on('error', reject);
        stream.on('end', () => resolve(entries));
    });
}
