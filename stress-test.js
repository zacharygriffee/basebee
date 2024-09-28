import { test } from 'brittle';
import Basebee from './index.js'; // Assuming the Basebee implementation is in the same directory
import Corestore from 'corestore';
import RAM from 'random-access-memory';
import b4a from 'b4a';

// Stress test parameters
const NUM_INSTANCES = 1000; // Modify this number to increase or decrease the stress
const KEYS_PER_INSTANCE = 10; // Number of keys to insert in each instance
const LOG_INTERVAL = 100; // Log after every 100 instances

test('Basebee stress test', async function (t) {
    t.timeout = Number.POSITIVE_INFINITY;

    const instances = [];
    const overallStartTime = Date.now();
    let startTime = overallStartTime;

    // Memory usage before creating instances
    console.log('Initial memory usage:', process.memoryUsage());

    // Create NUM_INSTANCES of Basebee
    for (let i = 0; i < NUM_INSTANCES; i++) {
        const store = new Corestore(RAM);
        const basebee = new Basebee(store, { valueEncoding: 'utf-8' });
        await basebee.ready();
        instances.push(basebee);

        // Insert KEYS_PER_INSTANCE random key-value pairs
        for (let j = 0; j < KEYS_PER_INSTANCE; j++) {
            const key = `key-${i}-${j}`;
            const value = `value-${i}-${j}`;
            await basebee.put(key, value);
        }

        // Check memory usage and time every LOG_INTERVAL instances
        if ((i + 1) % LOG_INTERVAL === 0) {
            const currentTime = Date.now();
            const timeElapsed = (currentTime - startTime) / 1000; // Time in seconds
            console.log(`Created ${i + 1} instances`);
            console.log('Current memory usage:', process.memoryUsage());
            console.log(`Time elapsed for last ${LOG_INTERVAL} instances: ${timeElapsed} seconds`);

            // Reset start time for next LOG_INTERVAL
            startTime = currentTime;
        }
    }

    const overallEndTime = Date.now();
    console.log(`Total time taken to create ${NUM_INSTANCES} Basebee instances: ${(overallEndTime - overallStartTime) / 1000} seconds`);

    // Perform operations on random instances
    for (let i = 0; i < NUM_INSTANCES; i++) {
        const basebee = instances[i];
        // Perform get and delete operations
        const randomKey = `key-${i}-${Math.floor(Math.random() * KEYS_PER_INSTANCE)}`;
        const value = await basebee.get(randomKey);
        t.ok(value, `Value for ${randomKey} should exist`);

        await basebee.del(randomKey);
        const deletedValue = await basebee.get(randomKey);
        t.is(deletedValue, null, `Value for ${randomKey} should be deleted`);
    }

    // Memory usage after operations
    console.log('Final memory usage:', process.memoryUsage());

    // Close all instances
    for (let i = 0; i < NUM_INSTANCES; i++) {
        await instances[i].close();
    }

    console.log('All Basebee instances closed');
});
