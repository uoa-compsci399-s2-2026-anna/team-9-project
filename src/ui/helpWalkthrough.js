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
const canvas = document.getElementById("simulation-canvas");

let isShowingHelp = false;

let helpTooltips = [];
let shownTooltipIndex = null;

/**
 * Minimum number of pixels mouse must have moved for it to count as a drag
 * (instead of a click).
 */
const DRAG_THRESHOLD_PX = 5;

let mouseDownStartX = 0;
let mouseDownStartY = 0;

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
bus.subscribe(EVENTS.HELP_WALKTHROUGH.SKIP_ALL, stopHelpWalkthrough);

document.addEventListener("mousedown", setMouseDownStartPositionVariables);
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

if (canvas) {
    canvas.addEventListener("click", (event) => {
        if (isClickEventDrag(event)) {
            event.preventDefault();
            return;
        }

        showNextHelpTooltipOrStopHelpWalkthrough();
    });
}

function isClickEventDrag(event) {
    const deltaX = Math.abs(event.clientX - mouseDownStartX);
    const deltaY = Math.abs(event.clientY - mouseDownStartY);

    return deltaX > DRAG_THRESHOLD_PX || deltaY > DRAG_THRESHOLD_PX;
}

/**
 * Begins the help walkthrough.
 */
function startHelpWalkthrough() {
    if (isShowingHelp) {
        return;
    }

    helpButtonTooltip.textContent = "Skip walkthrough";

    document
        .querySelectorAll("[data-help-tooltip]")
        .forEach(setTooltipPosition);

    if (helpTooltips.length === 0) {
        // Push all tooltips to list.
        document.querySelectorAll("[data-help-tooltip]").forEach((tooltip) => {
            const prioritiseOrder = JSON.parse(tooltip.dataset.prioritiseOrder);

            if (prioritiseOrder) {
                // Push to front (will be popped off first)
                helpTooltips.unshift(tooltip);
            } else {
                // Push to back
                helpTooltips.push(tooltip);
            }
        });
    }

    isShowingHelp = true;
    showNextHelpTooltip();
}

function stopHelpWalkthrough() {
    isShowingHelp = false;
    shownTooltipIndex = null;

    // Hide all tooltips
    document.querySelectorAll("[data-help-tooltip]").forEach((tooltip) => {
        tooltip.classList.add("invisible");
    });

    // Clean up all tooltips (resize listeners)
    for (const cleanup of cleanups.values()) {
        cleanup();
    }
    cleanups.clear();

    helpButtonTooltip.textContent = "Help";
}

/**
 * Shows the next help tooltip in the help walkthrough.
 */
function showNextHelpTooltip() {
    if (shownTooltipIndex === null) {
        shownTooltipIndex = 0;
    } else {
        shownTooltipIndex++;
    }

    if (shownTooltipIndex === helpTooltips.length) {
        stopHelpWalkthrough();
        return;
    }

    getShownTooltip().classList.remove("invisible");
}

function getShownTooltip() {
    if (shownTooltipIndex === null || !isShowingHelp) {
        return null;
    }

    return helpTooltips.at(shownTooltipIndex);
}

/**
 * Shows the next help tooltip in the help walkthrough, or stops the walkthrough
 * if there remain no more tooltips to show.
 */
function showNextHelpTooltipOrStopHelpWalkthrough() {
    if (!isShowingHelp) {
        return;
    }

    // Clean up and hide currently-shown tooltip
    const cleanup = cleanups.get(getShownTooltip());
    cleanup?.();
    cleanups.delete(getShownTooltip());
    getShownTooltip().classList.add("invisible");

    // Show next tooltip
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

function setMouseDownStartPositionVariables(event) {
    mouseDownStartX = event.clientX;
    mouseDownStartY = event.clientY;
}
