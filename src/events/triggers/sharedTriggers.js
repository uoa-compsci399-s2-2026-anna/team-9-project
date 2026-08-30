import { bus } from "../eventBus.js";
import { EVENTS } from "../events.js";

// Triggers for the fullscreen button
const fullscreenButton = document.getElementById("fullscreen-button");

fullscreenButton.addEventListener("click", () => {
    if (document.fullscreenElement) {
        bus.publish(EVENTS.FULLSCREEN_EXIT);
        console.log("Exited full screen");
    } else {
        bus.publish(EVENTS.FULLSCREEN_ENTER);
        console.log("Entered full screen");
    }
});
