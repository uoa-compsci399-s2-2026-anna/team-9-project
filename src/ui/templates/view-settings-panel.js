import { bus } from "/src/events/eventBus.js";
import { EVENTS } from "/src/events/events.js";

/**
 * Update the checkbox state in the view settings side panel when a setting is toggled (if necessary).
 *
 * This allows the checkboxes to be updated when view settings are reset.
 */
const VIEW_SETTING_EVENT_TO_DATA_SETTING = {
    [EVENTS.SIM.HABITABLE_ZONE_TOGGLE]: "habitable-zone",
    [EVENTS.SIM.ORBITS_TOGGLE]: "orbits",
    [EVENTS.SIM.REFERENCE_GRID_TOGGLE]: "reference-grid",
    [EVENTS.SIM.LABELS_TOGGLE]: "labels",
};

for (const [event, dataSetting] of Object.entries(
    VIEW_SETTING_EVENT_TO_DATA_SETTING,
)) {
    bus.subscribe(event, (event) => {
        const value = event.detail.value;

        const checkbox = document.querySelector(
            `[data-setting="${CSS.escape(dataSetting)}"]`,
        );

        if (checkbox && checkbox.checked !== value) {
            checkbox.checked = value;
        }
    });
}
