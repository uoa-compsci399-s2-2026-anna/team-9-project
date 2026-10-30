import { bus } from "../eventBus.js";
import { EVENTS } from "../events.js";
import { addNoDragClickEventListener } from "./sharedTriggers.js";

// Go to next step of help walkthrough if user clicks anywhere except buttons or
// containers. The reason this is a no-drag click rather than a simple click
// event listener is for parity with the simulation page.
addNoDragClickEventListener(document, (event) => {
    // Ignore if clicked a container or a button (button_with_tooltip or
    // text_button).
    if (
        event.target.closest(".container") ||
        event.target.closest("[data-button-type]") ||
        event.target.closest("#available-systems-buttons > a")
    ) {
        return;
    }

    bus.publish(EVENTS.HELP_WALKTHROUGH.NEXT);
});
