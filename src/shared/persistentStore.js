/**
 * Load state from the provided storage and merge it with the default state.
 * The target state is specified by the given key.
 * 
 * Saved state takes precedence over default state.
 * 
 * @param {string} key The key to retrieve the saved state from storage
 * @param {Storage} storage The storage object that persists the state
 * @param {Object} defaults The default state used when no state is saved
 * @returns {Object} The current state for the given key in the given storage
 */
export function loadState(key, storage, defaults) {
    try {
        const saved = storage.getItem(key);
        return saved ? { ...defaults, ...JSON.parse(saved) } : { ...defaults };
    } catch {
        return { ...defaults };
    }
}

/**
 * Factory which creates a function that persists the current application state to storage.
 * 
 * @param {string} key The key used to store the state in storage
 * @param {Storage} storage The storage object used to persist the state
 * @param {Function} getCurrentState A function that returns the current application state
 * @returns {Function} A function that saves the current state to storage when invoked
 */
export function createPersister(key, storage, getCurrentState) {
    return function persist() {
        storage.setItem(key, JSON.stringify(getCurrentState()));
    };
}
