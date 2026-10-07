import { bus } from "/src/events/eventBus.js";
import { EVENTS } from "/src/events/events.js";

const panel = document.getElementById("object-information-panel");

/**
 * The container containing the object information panel.
 */
export const container = panel.closest("[data-container]");

// Update object information panel when an object is clicked.
bus.subscribe(EVENTS.SIM.OBJECT_CLICK, (e) => {
    const objectName = e.detail.objectName;

    toggleContainer(true);

    const currentSystem = JSON.parse(panel.dataset.currentSystem);
    const allSystems = JSON.parse(panel.dataset.systems);

    const solarSystem = allSystems.find(
        (system) => system.name === "Solar System",
    );

    // Check if this object is in the Solar System (i.e. the user is comparing
    // to Solar System and clicks on a Solar System object
    const object = Object.keys(solarSystem.objects).includes(objectName)
        ? solarSystem.objects[objectName]
        : currentSystem.objects[objectName];

    panel.querySelector("[data-object-name]").textContent = objectName;
    panel.querySelector("[data-object-type]").textContent = capitalised(
        object.type,
    );
    updateDataField("[data-object-mass]", object.mass.value);
    updateDataField("[data-object-radius]", object.radius.value);
    updateDataField("[data-object-average-temperature]", object.temp.value);

    const SECONDS_IN_DAY = 86400;

    const heliocentricPeriod = object.period.heliocentric;

    if (heliocentricPeriod) {
        updateDataField(
            "[data-object-period]",
            Math.round(heliocentricPeriod / SECONDS_IN_DAY),
        );
    } else {
        updateDataField("[data-object-period]", null);
    }
});

bus.subscribe(EVENTS.SIM.CLOSE_OBJECT_INFO, () => toggleContainer(false));

/**
 * Toggles the container's visibility.
 * @param {boolean} doShow Should the container be shown.
 */
function toggleContainer(doShow) {
    container.classList.toggle("hidden", !doShow);
    container.classList.toggle("inline-flex", doShow);
}

/**
 * @param {string} text
 * @returns string `text` with the first character capitalised (or `null` if
 * text is none).
 */
function capitalised(text) {
    if (!text) {
        return null;
    }

    return text.charAt(0).toLocaleUpperCase() + text.slice(1);
}

/**
 * @param {string} selector The selector for the querySelector for the data field
 * @param {Number} value The numeric value to set the field's text to. If null,
 * the field is not shown at all.
 */
function updateDataField(selector, value) {
    const field = panel.querySelector(selector);
    const fieldContainer = field.closest("[data-field]");

    fieldContainer.classList.toggle("hidden", value === null);

    if (value !== null) {
        field.innerHTML = toScientificHTML(value);
    }

    const unit = fieldContainer.querySelector("[data-unit]");

    if (unit.textContent == "days" && value == 1) {
        unit.textContent = "day";
    }
}

/**
 * @param {Number} number The number to convert to scientific notation
 * @param {Number} decimalPlaces The number of digits in the fractional component of
 * the number in scientific notation (i.e. the number of digits after the
 * decimal point).
 * @param {Number} ignoreAbsoluteExponentsBelow Do not convert to scientific notation
 * for numbers * with an absolute value of their exponent less than this amount
 * (i.e. display small numbers normally)
 * @returns HTML of formatted scientific notation of number
 */
function toScientificHTML(
    number,
    decimalPlaces = 2,
    ignoreAbsoluteExponentsBelow = 4,
) {
    if (!number) {
        return null;
    }

    const formatted = number.toExponential(decimalPlaces);

    const [coefficient, exponent] = formatted.split("e");

    const exponentNumber = parseInt(exponent);

    if (Math.abs(exponentNumber) < ignoreAbsoluteExponentsBelow) {
        return number;
    }

    return `${coefficient} × 10<sup>${exponentNumber}</sup>`;
}
