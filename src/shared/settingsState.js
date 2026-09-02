// src/shared/settingsState.js
import { loadState, createPersister } from "./persistentStore.js";

const STORAGE_KEY = "settings";
const defaults = {
    timeZone: "UTC",
};

const initial = loadState(STORAGE_KEY, localStorage, defaults);

export let timeZone = initial.timeZone;

const persist = createPersister(STORAGE_KEY, localStorage, () => ({
    timeZone,
}));

export function setTimeZone(value) { 
    timeZone = value; 
    persist(); 
}
