import { bus } from "./eventBus.js";
import { EVENTS } from "./events.js";
import * as state from "../shared/simulationState.js";

const playPauseButton = document.getElementById("play-pause-button");

playPauseButton.addEventListener("click", () => {
    if (state.running) {
        bus.publish(EVENTS.SIM_STOP);
    } else {
        bus.publish(EVENTS.SIM_START);
    }
});
