import { bus } from "/src/events/eventBus.js";
import { EVENTS } from "/src/events/events.js";

// Update object information panel when an object is clicked.
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

/**
 * @param {*} mass_kg Mass in kilograms
 * @returns Mass in Jupiter masses
 */
function kgToMJupiter(mass_kg) {
    JUPITER_MASS_KG = 1.89813e27;
    return mass_kg / JUPITER_MASS_KG;
}

/**
 * @param {*} radius_m Radius in meters
 * @returns Radius in Jupiter radii
 */
function mToRJupiter(radius_m) {
    JUPITER_RADIUS_M = 71492e3;
    return radius_m / JUPITER_RADIUS_M;
}

/**
 * @param {*} kelvin Temperature in Kelvin
 * @returns Temperature in Celsius
 */
function kelvinToCelsius(kelvin) {
    ZERO_KELVIN_TO_CELSIUS = -273.15;
    return kelvin + ZERO_KELVIN_TO_CELSIUS;
}
