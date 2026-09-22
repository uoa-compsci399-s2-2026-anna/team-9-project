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
    panel.querySelector("[data-object-mass]").innerHTML = toScientificHTML(
        object.mass.value,
    );
    panel.querySelector("[data-object-radius]").innerHTML = toScientificHTML(
        object.radius.value,
    );
    panel.querySelector("[data-object-average-temperature]").innerHTML =
        toScientificHTML(object.temp.value);
});

/**
 * @param {*} number The number to convert to scientific notation
 * @param {*} fractionDigits The number of digits in the fractional component
 * @param {*} ignoreAbsoluteExponentsBelow Do not convert to scientific notation
 * for numbers * with an absolute value of their exponent less than this amount
 * (i.e. display small numbers normally)
 * @returns
 */
function toScientificHTML(
    number,
    fractionDigits = 2,
    ignoreAbsoluteExponentsBelow = 4,
) {
    const formatted = number.toExponential(fractionDigits);

    const [coefficient, exponent] = formatted.split("e");

    const exponentNumber = parseInt(exponent);

    if (Math.abs(exponentNumber) < ignoreAbsoluteExponentsBelow) {
        return number;
    }

    return `${coefficient} × 10<sup>${exponentNumber}</sup>`;
}
