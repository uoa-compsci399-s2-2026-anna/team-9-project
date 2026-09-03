import { bus } from "../eventBus.js";
import { EVENTS } from "../events.js";

const timeZoneSelect = document.getElementById("time-zone-select");

timeZoneSelect.addEventListener("change", (e) => {
    bus.publish(EVENTS.SETTINGS.TIME_ZONE_SELECT, { timeZone: e.target.value });
});
