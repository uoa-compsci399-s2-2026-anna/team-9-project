/**
 * Loads the current settings state (keys/values) from electron-store, which is
 * managed by the main process. Settings state is persisted between application runs.
 * 
 * @returns The settings state
 */
async function loadState() {
    if (!window.settingsAPI) {
        return {};
    }

    return await window.settingsAPI.get();
}

/**
 * Load the default settings state for the application. This is managed by the main process.
 * 
 * @returns The default settings state 
 */
async function loadDefaults() {
    if (!window.settingsAPI) {
        return {};
    }
    return await window.settingsAPI.getDefaults();
}

/**
 * Persists the updated settings state in electron-store (managed by the main process).
 */
function persist() {
    window.settingsAPI.set(settings).catch((err) => {
        console.error(`Failed to save setting: ${err}`);
    });
}

const [initialSettings, defaultSettings] = await Promise.all([loadState(), loadDefaults()]);;

export const settings = { ...initialSettings };

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

/**
 * Reset the settings state to the default settings.
 * Refresh the current application page to reflect this change.
 */
export function resetSettingsState() {
    Object.assign(settings, defaultSettings);
    persist();
    // Refresh the current page
    window.applicationAPI.refresh();
}
