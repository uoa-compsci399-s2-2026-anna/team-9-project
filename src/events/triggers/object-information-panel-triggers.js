import { bus } from "/src/events/eventBus.js";
import { EVENTS } from "/src/events/events.js";
import { objectInfoPanelContainer } from "/src/ui/components/object-information-panel.js";

const simulationCanvas = document.getElementById("simulation-canvas");

simulationCanvas.addEventListener("click", () => {
    if (objectInfoPanelContainer.checkVisibility()) {
        bus.publish(EVENTS.SIM.CLOSE_OBJECT_INFO);
    }
});
