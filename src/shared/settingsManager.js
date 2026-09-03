// TODO: reconsider where this file should live

import { bus } from "../events/eventBus.js";
import { EVENTS } from "../events/events.js";
import { setTimeZone } from "./settingsState.js";

bus.subscribe(EVENTS.SETTINGS.TIME_ZONE_SELECT, (event) => {
    setTimeZone(event.detail.timeZone);
});
