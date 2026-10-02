import { settings } from "../shared/settingsState.js";
import { getTheme, getFontSize, getFontFamily  } from "./simulationRenderer.js";
import { CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";

/**
 * Creates a label. The font size and family, and the div's background colour
 * are set as per the settings state.
 * @param {string} name Object name
 * @param {string} colour CSS colour string of label colour
 * @param {Number} opacity Opacity of label in interval [0, 1]
 * @returns {CSS2DObject} Created label div
 */
export function getLabel(name, colour, opacity) {
    const labelDiv = document.createElement("div");
    labelDiv.className = "planet-label";
    labelDiv.textContent = name;

    labelDiv.style.color = colour;

    labelDiv.style.opacity = opacity;

    labelDiv.style.fontSize = getFontSize(settings.textSize);
    labelDiv.style.fontFamily = getFontFamily(settings.font);
    labelDiv.style.fontWeight = "bold";
    labelDiv.style.backgroundColor = getTheme().labelBackground;
    labelDiv.style.padding = "1px 5px";
    labelDiv.style.borderRadius = "4px";
    labelDiv.style.whiteSpace = "nowrap";

    const label = new CSS2DObject(labelDiv);

    return label;
}
