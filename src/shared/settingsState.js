const defaults = {
    timeZone: "UTC",
    font: "Default",
    textSize: "Default",
    objectMarkerSize: "Default",
    orbitLines: "Colour",
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
    // TODO: extract a settings object? same for simulation state?
    window.settingsAPI.set({ 
        timeZone, 
        font, 
        textSize, 
        objectMarkerSize, 
        orbitLines 
    }).catch((err) => {
        console.error(`Failed to save setting: ${err}`);
    });
}

const initial = await loadState();

// Time zone
export let timeZone = initial.timeZone;

export function setTimeZone(value) {
    timeZone = value;
    persist();
}

// Font
export let font = initial.font;

export function setFont(value) {
    font = value;
    persist();
}

// Text size
export let textSize = initial.textSize;

export function setTextSize(value) {
    textSize = value;
    persist();
}

// Object marker size
export let objectMarkerSize = initial.objectMarkerSize;

export function setObjectMarkerSize(value) {
    objectMarkerSize = value;
    persist();
}

// Orbit lines
export let orbitLines = initial.orbitLines;

export function setOrbitLines(value) {
    orbitLines = value;
    persist();
}
