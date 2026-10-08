import { bus } from "/src/events/eventBus.js";
import { EVENTS } from "/src/events/events.js";

const systemDropdown = document.getElementById("system-dropdown");
const systemDropdownWrapper = document.getElementById(
    "system-dropdown-wrapper",
);
const systemInformationButton = document.getElementById(
    "system-information-button",
);

bus.subscribe(EVENTS.SIM.SYSTEM_DROPDOWN_TOGGLE, (event) => {
    const { showDropdown } = event.detail;

    systemDropdownWrapper
        .querySelector("[data-show-hide-icon]")
        .classList.toggle("-rotate-180", showDropdown);

    // TODO: Make this nicer (probably can use existing Tailwind classes e.g. clickable, etc.?)

    // Do not animate transition on open but do animate on close (the borders
    // rounding is animated on the 'closing' edge)
    systemInformationButton.classList.toggle("transition-none", showDropdown);
    systemInformationButton.classList.toggle("transition-all", !showDropdown);

    systemDropdown.classList.toggle("grid-rows-[1fr]", showDropdown);
    systemDropdown.classList.toggle("grid-rows-[0fr]", !showDropdown);

    systemDropdownWrapper.classList.toggle("bg-white", showDropdown);
    systemDropdownWrapper.classList.toggle("dark:bg-black", showDropdown);
    systemDropdownWrapper.classList.toggle("hover:bg-zinc-100", !showDropdown);
    systemDropdownWrapper.classList.toggle(
        "dark:hover:bg-zinc-900",
        !showDropdown,
    );

    if (showDropdown) {
        // Remove rounded corners from bottom so it looks consistent
        systemInformationButton.classList.add("rounded-b-none");

        systemDropdown.classList.add("bordered", "border-t-0");
    } else {
        // Add back rounded corners after transition has completed
        systemDropdown.addEventListener(
            "transitionend",
            () => {
                systemInformationButton.classList.remove(
                    "rounded-b-none",
                    "transition-all",
                );

                systemDropdown.classList.remove("bordered", "border-t-0");
            },
            { once: true },
        );
    }
});

// Panel interaction logic
document.querySelectorAll("[data-panel]").forEach((panel) => {
    const toggleEvent = panel.dataset.toggleEvent;
    const scrollContainer = panel.querySelector("[data-scroll-container]");
    const content = panel.querySelector("[data-panel-content]");

    bus.subscribe(toggleEvent, () => {
        const showHideIcon = panel.querySelector("[data-panel-show-hide-icon]");

        // Update visibility (expand/collapse)
        content.classList.toggle("grid-rows-[0fr]");
        content.classList.toggle("grid-rows-[1fr]");

        // Update open/closed icon
        showHideIcon.classList.toggle("-rotate-90");

        // Do not show scrollbar
        scrollContainer.classList.add("overflow-hidden");
        scrollContainer.classList.remove("overflow-y-auto");
    });

    // Do not show scrollbar
    content.addEventListener("transitionend", () => {
        const isOpen = content.classList.contains("grid-rows-[1fr]");

        if (isOpen) {
            scrollContainer.classList.add("overflow-y-auto");
            scrollContainer.classList.remove("overflow-hidden");
        }
    });
});
