import { bus } from "../events/eventBus.js";
import { EVENTS } from "../events/events.js";
import { setSetting } from "../shared/settingsState.js";

// Time zone
bus.subscribe(EVENTS.SETTINGS.TIME_ZONE_SELECT, (event) => {
    setSetting("timeZone", event.detail.value);
});

// Font
bus.subscribe(EVENTS.SETTINGS.FONT_SELECT, (event) => {
    setSetting("font", event.detail.value);
});

// Text size
bus.subscribe(EVENTS.SETTINGS.TEXT_SIZE_SELECT, (event) => {
    setSetting("textSize", event.detail.value);
});

// Object marker size
bus.subscribe(EVENTS.SETTINGS.OBJECT_MARKER_SIZE_SELECT, (event) => {
    setSetting("objectMarkerSize", event.detail.value);
});

// Orbit lines
bus.subscribe(EVENTS.SETTINGS.ORBIT_LINES_SELECT, (event) => {
    setSetting("orbitLines", event.detail.value);
});

// Dark mode
bus.subscribe(EVENTS.TOOLBAR.DARK_MODE_TOGGLE, (event) => {
    setSetting("darkMode", event.detail.enterDarkMode);
});
