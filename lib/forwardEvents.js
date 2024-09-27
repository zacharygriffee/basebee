export function forwardEvents(source, target, events) {
    const listeners = events.map(event => {
        const listener = (...args) => {
            // For error events, rethrow the error if it occurs.
            if (event === 'error') {
                const [error] = args;
                if (error instanceof Error) {
                    throw error;
                }
            }
            args.push(source);
            target.emit(event, ...args);
        };
        source.on(event, listener);
        return {event, listener};
    });
    return () => {
        listeners.forEach(({event, listener}) => {
            source.off(event, listener);
        });
    };
}