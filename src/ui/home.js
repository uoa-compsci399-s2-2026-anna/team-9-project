import {
    computePosition,
    flip,
    autoUpdate,
    shift,
    offset,
    arrow,
} from "@floating-ui/dom";
import { bus } from "../events/eventBus.js";
import { EVENTS } from "../events/events.js";

let cleanups = new Map();

let isShowingHelp = false;
let helpTooltipsToShow = [];
let shownTooltip = null;

bus.subscribe(EVENTS.TOOLBAR.HELP_BUTTON_CLICK, startHelpWalkthrough);
document.addEventListener("click", showNextHelpTooltipOrStopHelpWalkthrough);
document.querySelectorAll("[data-help-tooltip]").forEach(setTooltipPosition);

/**
 * Begins the help walkthrough.
 */
function startHelpWalkthrough() {
    if (helpTooltipsToShow.length != 0) {
        return;
    }

    // Push all tooltips to list.
    document.querySelectorAll("[data-help-tooltip]").forEach((tooltip) => {
        helpTooltipsToShow.push(tooltip);
    });

    showNextHelpTooltip();
}

/**
 * Shows the next help tooltip in the help walkthrough.
 */
function showNextHelpTooltip() {
    if (helpTooltipsToShow.length == 0) {
        isShowingHelp = false;
        return;
    }

    isShowingHelp = true;

    shownTooltip = helpTooltipsToShow.pop();
    shownTooltip.classList.remove("hidden");
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
    cleanup();
    shownTooltip.classList.add("hidden");

    showNextHelpTooltip();
}

/**
 * Sets `tooltip`'s position using floating-ui, and automatically updates its 
 * position on screen size changes, etc.
 * @param {HTMLElement} tooltip The tooltip element's position to set.
 */
function setTooltipPosition(tooltip) {
    let target = tooltip.previousElementSibling;
    let arrowOutline = tooltip.querySelector("[data-tooltip-arrow-outline]");
    let arrowFill = tooltip.querySelector("[data-tooltip-arrow-fill]");

    const siblingCount = tooltip.parentElement.children.length - 1;

    if (siblingCount > 1) {
        console.warn(
            "This tooltip has more than one sibling! Tooltips should only have one sibling element (the target element).",
        );
    }

    if (!target) {
        target = tooltip.nextElementSibling;
    }

    if (!target) {
        console.error(
            `Tooltip ${tooltip} has no target! The target should be a sibling element.`,
        );
        return;
    }

    /**
     * Updates the position of this tooltip.
     */
    function updatePosition() {
        // Compute the position of the tooltip using floating-ui
        computePosition(target, tooltip, {
            placement: "bottom",
            middleware: [
                offset(remToPx(0.5)), // Offset tooltip from target
                flip(), // Flip tooltip if out of bounds
                shift({ padding: remToPx(1) }), // Shift tooltip if out of bounds
                arrow({ element: arrowOutline }), // Add arrow pointing to target
                arrow({ element: arrowFill }), // Add arrow pointing to target
            ],
        }).then(({ x, y, placement, middlewareData }) => {
            // Place the tooltip in the correct position w.r.t. the target.
            Object.assign(tooltip.style, {
                position: "absolute",
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
