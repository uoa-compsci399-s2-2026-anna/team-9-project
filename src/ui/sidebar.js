import { bus } from "../events/eventBus.js";
import { EVENTS } from "../events/events.js";

/**
 * Update the checkbox state in the object side panel when an object is toggled (if necessary).
 * 
 * This allows the checkboxes to be updated when the object visibility state is reset.
 */
bus.subscribe(EVENTS.SIM.OBJECT_TOGGLE, (event) => {
    const { name, value } = event.detail;

    const checkbox = document.querySelector(
        `[data-object="${CSS.escape(name)}"]`
    );

    // Update the value of the checkbox if necessary
    if (checkbox && checkbox.checked !== value) {
        checkbox.checked = value;
    }
});
