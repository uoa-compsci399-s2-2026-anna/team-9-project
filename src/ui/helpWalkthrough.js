import {
    computePosition,
    autoUpdate,
    shift,
    offset,
    arrow,
    autoPlacement,
} from "@floating-ui/dom";
import { bus } from "../events/eventBus.js";
import { EVENTS } from "../events/events.js";

const cleanups = new Map();
const tooltipTargets = new Map();

let isShowingHelp = false;
let helpTooltipsToShow = [];
let shownTooltip = null;

bus.subscribe(EVENTS.TOOLBAR.HELP_BUTTON_CLICK, () => {
    if (isShowingHelp) {
        stopHelpWalkthrough();
    } else {
        startHelpWalkthrough();
    }
});
document.addEventListener("click", (event) => {
    const availableSystemsButtons = document.getElementById(
        "available-systems-buttons",
    );

    // Return if not on the home screen.
    if (!availableSystemsButtons) {
        return;
    }

    // Stop help walkthrough if clicking the available systems buttons on the
    // home screen. This prevents showing the next tooltip while the page
    // changes.
    if (availableSystemsButtons.contains(event.target)) {
        stopHelpWalkthrough();
    }

    showNextHelpTooltipOrStopHelpWalkthrough();
});
bus.subscribe(EVENTS.SETTINGS.OPEN_SETTINGS_MENU, stopHelpWalkthrough);

/**
 * Begins the help walkthrough.
 */
function startHelpWalkthrough() {
    if (isShowingHelp) {
        return;
    }
    if (helpTooltipsToShow.length != 0) {
        return;
    }

    document
        .querySelectorAll("[data-help-tooltip]")
        .forEach(setTooltipPosition);

    // Push all tooltips to list.
    document.querySelectorAll("[data-help-tooltip]").forEach((tooltip) => {
        helpTooltipsToShow.push(tooltip);
    });

    showNextHelpTooltip();
}

function stopHelpWalkthrough() {
    helpTooltipsToShow = [];
    isShowingHelp = false;

    if (shownTooltip) {
        shownTooltip.classList.add("invisible");
        shownTooltip = null;
    }

    for (const cleanup of cleanups.values()) {
        cleanup();
    }
    cleanups.clear();

    // showNextHelpTooltip();
}

/**
 * Shows the next help tooltip in the help walkthrough.
 */
function showNextHelpTooltip() {
    if (helpTooltipsToShow.length == 0) {
        stopHelpWalkthrough();
        return;
    }

    isShowingHelp = true;

    shownTooltip = helpTooltipsToShow.pop();
    shownTooltip.classList.remove("invisible");
}

/**
 * Shows the next help tooltip in the help walkthrough, or stops the walkthrough
 * if there remain no more tooltips to show.
 */
function showNextHelpTooltipOrStopHelpWalkthrough() {
    if (!isShowingHelp) {
        return;
    }

    const cleanup = cleanups.get(shownTooltip);
    cleanup?.();
    cleanups.delete(shownTooltip);
    shownTooltip.classList.add("invisible");

    showNextHelpTooltip();
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
            placement: "left",
            strategy: "fixed",
            middleware: [
                offset(remToPx(0.5)), // Offset tooltip from target
                autoPlacement(), // Flip tooltip if out of bounds
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
