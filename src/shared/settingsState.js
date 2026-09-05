async function loadState() {
    return await window.settingsAPI.get();
}

function persist() {
    // TODO: extract a settings object? same for simulation state?
    window.settingsAPI.set({ 
        timeZone, 
        font, 
        textSize, 
        objectMarkerSize, 
        orbitLine,
        darkMode, 
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
export let orbitLine = initial.orbitLine;

export function setOrbitLine(value) {
    orbitLine = value;
    persist();
}

// Dark mode
// TODO: this isn't done right
// TODO: I am not sure about whether resetting settings should reset this. Feels slightly out of place.
export let darkMode = initial.darkMode;

export function toggleDarkMode(value) {
    darkMode = value;
    persist();
}
