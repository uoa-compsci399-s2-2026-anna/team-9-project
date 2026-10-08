import { bus } from "../eventBus.js";
import { EVENTS } from "../events.js";

// System dropdown (e.g., for changing between Solar System and Kepler-16 on the simulation page)
const systemButton = document.getElementById("system-information-button");

let systemDropdownOpen = false;

systemButton.addEventListener("click", () => {
    systemDropdownOpen = !systemDropdownOpen;
    bus.publish(EVENTS.SIM.SYSTEM_DROPDOWN_TOGGLE, {
        showDropdown: systemDropdownOpen,
    });
});
