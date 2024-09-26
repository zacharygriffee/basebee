export function getPropFromMultipleObjects(key, ...objects) {
    return objects.find(o => !!o[key])?.[key]
}