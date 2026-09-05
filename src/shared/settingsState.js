async function loadState() {
    return await window.settingsAPI.get();
}

function persist() {
    window.settingsAPI.set(settings).catch((err) => {
        console.error(`Failed to save setting: ${err}`);
    });
}

const initial = await loadState();

export const settings = { ...initial };

export function setSetting(key, value) {
    if (!(key in settings)) {
        throw new Error(`Unknown setting: ${key}`);
    }

    settings[key] = value;
    persist();
}
