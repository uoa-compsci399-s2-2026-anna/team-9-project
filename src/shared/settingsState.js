const defaults = {
    timeZone: "UTC",
};

async function loadState() {
    try {
        const saved = await window.settingsAPI.get();
        return { ...defaults, ...saved };
    } catch {
        return { ...defaults };
    }
}

function persist() {
    window.settingsAPI.set({ timeZone }).catch((err) => {
        console.error(`Failed to save setting: ${err}`);
    });
}

const initial = await loadState();

export let timeZone = initial.timeZone;

export function setTimeZone(value) {
    timeZone = value;
    persist();
}
