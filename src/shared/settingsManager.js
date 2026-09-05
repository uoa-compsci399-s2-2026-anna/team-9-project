// TODO: reconsider where this file should live

import { bus } from "../events/eventBus.js";
import { EVENTS } from "../events/events.js";
import { 
    setFont, 
    setObjectMarkerSize, 
    setOrbitLine, 
    setTextSize, 
    setTimeZone,
    toggleDarkMode,
} from "./settingsState.js";

// Time zone
bus.subscribe(EVENTS.SETTINGS.TIME_ZONE_SELECT, (event) => {
    setTimeZone(event.detail.timeZone);
});

// Font
bus.subscribe(EVENTS.SETTINGS.FONT_SELECT, (event) => {
    setFont(event.detail.font);
});

// Text size
bus.subscribe(EVENTS.SETTINGS.TEXT_SIZE_SELECT, (event) => {
    setTextSize(event.detail.textSize);
});

// Object marker size
bus.subscribe(EVENTS.SETTINGS.OBJECT_MARKER_SIZE_SELECT, (event) => {
    setObjectMarkerSize(event.detail.objectMarkerSize);
});

// Orbit lines
bus.subscribe(EVENTS.SETTINGS.ORBIT_LINES_SELECT, (event) => {
    setOrbitLine(event.detail.orbitLine);
});

// Dark mode
bus.subscribe(EVENTS.TOOLBAR.DARK_MODE_TOGGLE, (event) => {
    toggleDarkMode(event.detail.darkMode);
});
