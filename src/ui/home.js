import {
    computePosition,
    flip,
    autoUpdate,
    shift,
    offset,
    arrow,
} from "@floating-ui/dom";

let cleanups = [];

document.getElementById("show-tooltips").addEventListener("click", () => {
    console.log("show tooltips clicked");
    document.querySelectorAll("[data-help-tooltip]").forEach((tooltip) => {
        tooltip.classList.remove("hidden");
    });
});

document.getElementById("hide-tooltips").addEventListener("click", () => {
    console.log(cleanups);
    cleanups.forEach((c) => c());
    document.querySelectorAll("[data-help-tooltip]").forEach((tooltip) => {
        tooltip.classList.add("hidden");
    });
    console.log(cleanups);
});

document.querySelectorAll("[data-help-tooltip]").forEach((tooltip) => {
    let target = tooltip.previousElementSibling;
    let arrowElement = tooltip.querySelector("[data-tooltip-arrow]");
    let arrowElement2 = tooltip.querySelector("[data-tooltip-arrow-2]");

    if (!target) {
        target = tooltip.nextElementSibling;
    }

    if (!target) {
        console.error(
            `tooltip ${tooltip} has no target! the target should be a sibling element.`,
        );
        return;
    }

    console.log(`target: ${target}`);

    function updatePosition() {
        computePosition(target, tooltip, {
            placement: "bottom",
            middleware: [
                offset(remToPx(0.5)),
                flip(),
                shift({ padding: remToPx(1) }),
                arrow({ element: arrowElement }),
                arrow({ element: arrowElement2 }),
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

            Object.assign(arrowElement.style, {
                left: arrowX != null ? `${arrowX}px` : "",
                top: arrowY != null ? `${arrowY}px` : "",
                right: "",
                bottom: "",
                [staticSide]: "-4px",
            });
            Object.assign(arrowElement2.style, {
                left: arrowX != null ? `${arrowX}px` : "",
                top: arrowY != null ? `${arrowY}px` : "",
                right: "",
                bottom: "",
                [staticSide]: "-4px",
            });
        });
    }

    const cleanup = autoUpdate(target, tooltip, updatePosition);
    cleanups.push(cleanup);
});

function remToPx(rem) {
    return (
        rem * parseFloat(getComputedStyle(document.documentElement).fontSize)
    );
}
