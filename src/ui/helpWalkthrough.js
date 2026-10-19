import {
    computePosition,
    autoUpdate,
    shift,
    offset,
    arrow,
    autoPlacement,
    flip,
} from "@floating-ui/dom";
import { bus } from "../events/eventBus.js";
import { EVENTS } from "../events/events.js";

const cleanups = new Map();
const tooltipTargets = new Map();

const helpButtonTooltip = document.getElementById("help-button-tooltip");

let isShowingHelp = false;

let helpTooltips = [];
let shownTooltipIndex = null;

document.addEventListener("mouseup", handleMouseUpOnDocument);

bus.subscribe(EVENTS.TOOLBAR.HELP_BUTTON_CLICK, () => {
    if (isShowingHelp) {
        stopHelpWalkthrough();
    } else {
        startHelpWalkthrough();
    }
});
bus.subscribe(EVENTS.SETTINGS.OPEN_SETTINGS_MENU, stopHelpWalkthrough);
bus.subscribe(
    EVENTS.HELP_WALKTHROUGH.NEXT,
    showNextHelpTooltipOrStopHelpWalkthrough,
);
bus.subscribe(EVENTS.HELP_WALKTHROUGH.PREVIOUS, showPreviousHelpTooltip);
bus.subscribe(EVENTS.HELP_WALKTHROUGH.SKIP_ALL, stopHelpWalkthrough);

document.querySelectorAll("[data-help-tooltip]").forEach(initialiseTooltip);

/**
 * Tries to show the next help tooltip or stop walkthrough. Does nothing if
 * mouse up on a `.container`, `.flatpickr-calendar`,
 * or `[data-button-type]`. If mouseup on the available systems button in the
 * home page, stops the walkthrough.
 * @param {Event} event The mouseup event
 */
function handleMouseUpOnDocument(event) {
    const availableSystemsButtons = document.getElementById(
        "available-systems-buttons",
    );

    // Stop help walkthrough if clicking the available systems buttons on the
    // home screen. This prevents showing the next tooltip while the page
    // changes.
    if (
        availableSystemsButtons &&
        availableSystemsButtons.contains(event.target)
    ) {
        stopHelpWalkthrough();
    }

    if (
        event.target.closest(".container") ||
        event.target.closest(".flatpickr-calendar") ||
        event.target.closest("[data-button-type]") ||
        // Ignore simulation canvas clicks (this is handled in function onCanvasClick in simulationRenderer.js)
        event.target.closest("#simulation-canvas")
    ) {
        return;
    }

    showNextHelpTooltipOrStopHelpWalkthrough();
}

/**
 * Adds `tooltip` to the `helpTooltips` array, taking into account any priority
 * it may had (i.e. whether it should be displayed first).
 * @param {HTMLElement} tooltip The tooltip to add
 */
function addTooltipToHelpTooltipsArray(tooltip) {
    const prioritiseOrder = JSON.parse(tooltip.dataset.prioritiseOrder);

    if (prioritiseOrder) {
        // Push to front (will be popped off first)
        helpTooltips.unshift(tooltip);
    } else {
        // Push to back
        helpTooltips.push(tooltip);
    }
}

/**
 * Begins the help walkthrough.
 */
function startHelpWalkthrough() {
    if (isShowingHelp) {
        return;
    }

    helpButtonTooltip.textContent = "End walkthrough";

    isShowingHelp = true;
    showNextHelpTooltipOrStopHelpWalkthrough();
}

function stopHelpWalkthrough() {
    isShowingHelp = false;
    shownTooltipIndex = null;

    // Hide all tooltips
    document.querySelectorAll("[data-help-tooltip]").forEach((tooltip) => {
        tooltip.classList.add("invisible");
    });

    // Clean up all tooltips (canvas resize listeners which update tooltip
    // positions when the canvas resizes)
    for (const cleanup of cleanups.values()) {
        cleanup();
    }
    cleanups.clear();

    helpButtonTooltip.textContent = "Help";
}

/**
 * Returns the tooltip currently being shown, or `null` if the help walkthrough
 * is not in progress.
 * @returns {HTMLElement} The tooltip currently being shown
 */
function getCurrentHelpTooltip() {
    if (shownTooltipIndex === null || !isShowingHelp) {
        return null;
    }

    return helpTooltips.at(shownTooltipIndex);
}

function hideCurrentHelpTooltip() {
    // Clean up and hide currently-shown tooltip
    const cleanup = cleanups.get(getCurrentHelpTooltip());
    cleanup?.();
    cleanups.delete(getCurrentHelpTooltip());
    getCurrentHelpTooltip().classList.add("invisible");
}

function showPreviousHelpTooltip() {
    if (
        !isShowingHelp ||
        shownTooltipIndex === 0 ||
        shownTooltipIndex === null
    ) {
        return;
    }

    hideCurrentHelpTooltip();
    shownTooltipIndex--;
    showCurrentTooltip();
}

function showCurrentTooltip() {
    getCurrentHelpTooltip().classList.remove("invisible");
    updateCurrentHelpTooltipProgressText();
}

/**
 * Shows the next help tooltip in the help walkthrough, or stops the walkthrough
 * if there remain no more tooltips to show.
 */
function showNextHelpTooltipOrStopHelpWalkthrough() {
    if (!isShowingHelp) {
        return;
    }

    // Update index; hide current tooltip if necessary
    if (shownTooltipIndex === null) {
        shownTooltipIndex = 0;
    } else {
        hideCurrentHelpTooltip();
        shownTooltipIndex++;
    }

    // Stop walkthrough if at end
    if (shownTooltipIndex === helpTooltips.length) {
        stopHelpWalkthrough();
        return;
    }

    showCurrentTooltip();
}

function updateCurrentHelpTooltipProgressText() {
    // Query selector all required as we duplicate the tooltip to add the border
    // and background colour.
    getCurrentHelpTooltip()
        .querySelectorAll("[data-progress-text]")
        .forEach((text) => {
            text.textContent = `${shownTooltipIndex + 1}/${helpTooltips.length}`;
        });
}

/**
 * Adds the background and outline to `tooltip` by duplicating the element
 * and updating the style accordingly.
 * @param {HTMLElement} tooltip The tooltip
 */
function addTooltipBackgroundAndOutline(tooltip) {
    const tooltipContent = tooltip.querySelector("[data-tooltip-content]");

    const tooltipBackgroundAndOutline = tooltipContent.cloneNode(true);
    tooltipBackgroundAndOutline.classList.forEach((className) => {
        const Z_INDEX_CLASS = /^z-[0-9]+$/;
        const BORDER_CLASS = /^border-[A-Za-z0-9]+$/;
        const BACKGROUND_COLOUR_CLASS = /^bg-[A-Za-z0-9]+$/;
        const ABSOLUTE_CLASS = /^absolute$/;

        if (
            Z_INDEX_CLASS.test(className) ||
            BORDER_CLASS.test(className) ||
            BACKGROUND_COLOUR_CLASS.test(className) ||
            ABSOLUTE_CLASS.test(className)
        ) {
            tooltipBackgroundAndOutline.classList.remove(className);
        }
    });

    tooltipBackgroundAndOutline.classList.add("z-10");
    tooltipBackgroundAndOutline.classList.add("bordered-light");
    tooltipBackgroundAndOutline.classList.add("relative");
    tooltipBackgroundAndOutline.classList.add("bg-white");
    tooltipBackgroundAndOutline.classList.add("dark:bg-zinc-950");

    Array.from(tooltipBackgroundAndOutline.children).forEach((child) => {
        child.classList.add("invisible");
    });

    tooltipContent.before(tooltipBackgroundAndOutline);
}

function initialiseTooltip(tooltip) {
    addTooltipToHelpTooltipsArray(tooltip);
    addTooltipBackgroundAndOutline(tooltip);
    setTooltipPosition(tooltip);
}

/**
 * Sets `tooltip`'s position using floating-ui, and automatically updates its
 * position on screen size changes, etc.
 * @param {HTMLElement} tooltip The tooltip element's position to set.
 */
function setTooltipPosition(tooltip) {
    let target = tooltipTargets.get(tooltip);
    let arrowOutline = tooltip.querySelector("[data-tooltip-arrow-outline]");
    let arrowFill = tooltip.querySelector("[data-tooltip-arrow-fill]");

    let placement = tooltip.dataset.placement;
    let doUseAutoPlacement = JSON.parse(tooltip.dataset.autoPlacement);

    if (!target) {
        target = tooltip.previousElementSibling ?? tooltip.nextElementSibling;
    }

    if (!target) {
        console.error(
            `Tooltip ${tooltip} has no target! The target should be a sibling element.`,
        );
        return;
    }

    tooltipTargets.set(tooltip, target);
    if (tooltip.parentElement !== document.body) {
        document.body.append(tooltip);
    }

    cleanups.get(tooltip)?.();

    /**
     * Updates the position of this tooltip.
     */
    function updatePosition() {
        // Compute the position of the tooltip using floating-ui
        computePosition(target, tooltip, {
            placement: placement,
            strategy: "fixed",
            middleware: [
                offset(remToPx(0.5)), // Offset tooltip from target
                doUseAutoPlacement ? autoPlacement() : flip(), // Flip tooltip if out of bounds
                shift({ padding: remToPx(1) }), // Shift tooltip if out of bounds
                arrow({ element: arrowOutline }), // Add arrow pointing to target
                arrow({ element: arrowFill }), // Add arrow pointing to target
            ],
        }).then(({ x, y, placement, middlewareData }) => {
            // Place the tooltip in the correct position w.r.t. the target.
            Object.assign(tooltip.style, {
                position: "fixed",
                left: `${x}px`,
                top: `${y}px`,
            });

            // Set arrow positioning.
            const { x: arrowX, y: arrowY } = middlewareData.arrow;
            const staticSide = {
                top: "bottom",
                right: "left",
                bottom: "top",
                left: "right",
            }[placement.split("-")[0]];

            const arrowStyle = {
                left: arrowX != null ? `${arrowX}px` : "",
                top: arrowY != null ? `${arrowY}px` : "",
                right: "",
                bottom: "",
                [staticSide]: "-4px",
            };

            Object.assign(arrowOutline.style, arrowStyle);
            Object.assign(arrowFill.style, arrowStyle);
        });
    }

    // Automatically update tooltip position on screen resize, etc.; `cleanup`
    // stores a cleanup function for once the tooltip is no longer displayed.
    const cleanup = autoUpdate(target, tooltip, updatePosition);
    cleanups.set(tooltip, cleanup);
}

function remToPx(rem) {
    return (
        rem * parseFloat(getComputedStyle(document.documentElement).fontSize)
    );
}
