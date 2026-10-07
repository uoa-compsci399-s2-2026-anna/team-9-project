import { bus } from "/src/events/eventBus.js";
import { EVENTS } from "/src/events/events.js";
import { objectInfoPanelContainer } from "/src/ui/components/object-information-panel.js";

// Close the object info panel when the user clicks off the panel.
document.addEventListener("click", (e) => {
    if (
        // Container is visible
        objectInfoPanelContainer.checkVisibility() &&
        // Target is outside of all containers (including the object info panel
        // container), side panels, and overlays
        [
            ...document.querySelectorAll(
                "[data-container], [data-panel], [data-overlay]",
            ),
        ].every((container) => {
            return !container.contains(e.target);
        })
    ) {
        bus.publish(EVENTS.SIM.CLOSE_OBJECT_INFO);
    }
});
