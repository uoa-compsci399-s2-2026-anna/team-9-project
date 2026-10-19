import { bus } from "../eventBus.js";
import { EVENTS } from "../events.js";
import { addNoDragClickEventListener } from "./sharedTriggers.js";

addNoDragClickEventListener(document, (event) => {
    if (
        event.target.closest(".container") ||
        event.target.closest("[data-button-type]")
    ) {
        return;
    }

    bus.publish(EVENTS.HELP_WALKTHROUGH.NEXT);
});

// Skip help walkthrough when a system button on the home screen is clicked.
// This prevents the next tooltip from showing before the page changes.
document.addEventListener("click", (event) => {
    if (event.target.closest("#available-systems-buttons > a")) {
        bus.publish(EVENTS.HELP_WALKTHROUGH.SKIP_ALL);
    }
});
