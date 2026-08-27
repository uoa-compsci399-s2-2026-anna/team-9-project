import { bus } from "./eventBus.js";
import { EVENTS } from "./events.js";
import * as state from "../shared/simulationState.js";

const playPauseButton = document.getElementById("play-pause-button");

playPauseButton.addEventListener("click", () => {
    if (state.running) {
        bus.emit(EVENTS.SIM_STOP);
    } else {
        bus.emit(EVENTS.SIM_START);
    }
});


// TEMP FOR TESTING

bus.subscribe(EVENTS.SIM_START, () => {
    console.log("Started simulation");
    state.setRunning(true);
})

bus.subscribe(EVENTS.SIM_STOP, () => {
    console.log("Stopped simulation");
    state.setRunning(false);
})