// src/events/triggers/settingsTriggers.js
import * as settings from "../../shared/settingsState.js";

const timeZoneSelect = document.querySelector("select[name='time-zone']");

timeZoneSelect.value = settings.timeZone;

timeZoneSelect.addEventListener("change", (e) => {
    console.log(e.target.value);
    settings.setTimeZone(e.target.value);
});
