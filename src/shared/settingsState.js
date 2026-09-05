import settingsSchema from "./settingsSchema.json" with { type: "json" };

async function loadState() {
    return await window.settingsAPI.get();
}

function persist() {
    window.settingsAPI.set(settings).catch((err) => {
        console.error(`Failed to save setting: ${err}`);
    });
}

function isValidValue(key, value) {
    return settingsSchema[key].options.some(option => option.value === value);
}

// TODO: dark mode is added after (not in the json) which feels a bit strange
const initial = await loadState();

export const settings = { ...initial };

export function setSetting(key, value) {
    if (!(key in settings)) {
        throw new Error(`Unknown setting: ${key}`);
    }

    if (!isValidValue(key, value)) {
        throw new Error(`Invalid value for setting "${key}": ${value}`);
    }

    settings[key] = value;
    persist();
}
