/**
 * Loads the current settings state (keys/values) from electron-store, which is
 * managed by the main process. Settings state is persisted between application runs.
 * 
 * @returns The settings state
 */
async function loadState() {
    return await window.settingsAPI.get();
}

/**
 * Persists the updated settings state in electron-store (managed by the main process).
 */
function persist() {
    window.settingsAPI.set(settings).catch((err) => {
        console.error(`Failed to save setting: ${err}`);
    });
}

const initial = await loadState();

export const settings = { ...initial };

/**
 * Updates a setting in the settings state and persists the change.
 *
 * @param {string} key The name of the setting to update
 * @param {*} value The new value for the setting
 * @throws {Error} If the specified setting does not exist
 */
export function setSetting(key, value) {
    if (!(key in settings)) {
        throw new Error(`Unknown setting: ${key}`);
    }

    settings[key] = value;
    persist();
}
