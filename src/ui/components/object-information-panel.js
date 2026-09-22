import { bus } from "/src/events/eventBus.js";
import { EVENTS } from "/src/events/events.js";

bus.subscribe(EVENTS.SIM.OBJECT_CLICK, (e) => {
    const objectName = e.detail.objectName;
    const panel = document.getElementById("object-information-panel");
    const placeholder = document.getElementById(
        "object-information-panel-no-object-selected-view",
    );

    // TODO: Keep track of selected object state
    panel.classList.remove("hidden");
    placeholder.classList.add("hidden");

    const systems = JSON.parse(panel.dataset.currentSystem);

    const object = systems.objects[objectName];

    panel.querySelector("[data-object-name]").textContent = objectName;
    panel.querySelector("[data-object-mass]").textContent = object.mass.value;
    panel.querySelector("[data-object-radius]").textContent =
        object.radius.value;
    panel.querySelector("[data-object-average-temperature]").textContent =
        object.temp.value;
});
