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

document.querySelectorAll("[data-help-tooltip]").forEach((tooltip) => {
    let target = tooltip.previousElementSibling;
    let arrowOutline = tooltip.querySelector("[data-tooltip-arrow-outline]");
    let arrowFill = tooltip.querySelector("[data-tooltip-arrow-fill]");

    if (!target) {
        target = tooltip.nextElementSibling;
    }

    if (!target) {
        console.error(
            `tooltip ${tooltip} has no target! the target should be a sibling element.`,
        );
        return;
    }

    function updatePosition() {
        computePosition(target, tooltip, {
            placement: "bottom",
            middleware: [
                offset(remToPx(0.5)),
                flip(),
                shift({ padding: remToPx(1) }),
                arrow({ element: arrowOutline }),
                arrow({ element: arrowFill }),
            ],
        }).then(({ x, y, placement, middlewareData }) => {
            Object.assign(tooltip.style, {
                position: "absolute",
                left: `${x}px`,
                top: `${y}px`,
            });

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

    const cleanup = autoUpdate(target, tooltip, updatePosition);
    cleanups.set(tooltip, cleanup);
});

function remToPx(rem) {
    return (
        rem * parseFloat(getComputedStyle(document.documentElement).fontSize)
    );
}
