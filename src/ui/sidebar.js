import { bus } from "../events/eventBus.js";
import { EVENTS } from "../events/events.js";

/**
 * Update the checkbox state in the objects side panel when an object is toggled (if necessary).
 * 
 * This allows the checkboxes to be updated when the object visibility state is reset.
 */
bus.subscribe(EVENTS.SIM.OBJECT_TOGGLE, (event) => {
    const { name, value } = event.detail;

    const checkbox = document.querySelector(`[data-object="${CSS.escape(name)}"]`);

    // Update the value of the checkbox if necessary
    if (checkbox && checkbox.checked !== value) {
        checkbox.checked = value;
    }
});

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

for (const [event, dataSetting] of Object.entries(VIEW_SETTING_EVENT_TO_DATA_SETTING)) {
    bus.subscribe(event, (event) => {
        const value = event.detail.value;

        const checkbox = document.querySelector(`[data-setting="${CSS.escape(dataSetting)}"]`);

        if (checkbox && checkbox.checked !== value) {
            checkbox.checked = value;
        }
    });
}
