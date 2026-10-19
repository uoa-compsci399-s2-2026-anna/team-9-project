import {
    simulationState,
    isObjectHidden,
} from "../../shared/simulationState.js";
import { renderer } from "../renderers.js";

export const ORBIT_POINTS_COUNT = 360; // Number of points to approximate the ellipse

// Orbit line widths as a proportion of the canvas size (the smaller of the canvas width and height)
const ORBIT_LINE_WIDTH_PROPORTION = 0.025;
const COMPARISON_ORBIT_LINE_WIDTH_PROPORTION = 0.02;
const ORBIT_LINE_MIN_PIXEL_WIDTH = 1;

const ORBIT_LINE_MIN_OPACITY = 0.2;
const ORBIT_LINE_MIN_WIDTH = 0.5;

/**
 * A function defining the curve/profile of the opacity/width modulation of
 * the orbit line.
 * @param {Number} distance Proportion of a full revolution this point is from
 * the object.
 * @returns Scale factor betwee 0 and 1 of opacity/line width.
 */
export const ORBIT_LINE_OPACITY_MODULATION_FUNCTION = (distance) =>
    Math.max(ORBIT_LINE_MIN_OPACITY, 1 - distance);

export const ORBIT_LINE_WIDTH_MODULATION_FUNCTION = (distance) =>
    Math.max(ORBIT_LINE_MIN_WIDTH, Math.cos((Math.PI * distance) / 2));

/**
 * Determines whether an object's orbit should be visible. An orbit should be visible if
 * orbit lines are set as visible and the object has not been hidden in the current system.
 *
 * Given visibility values take precedence over saved simulation state (since this state
 * may not have been synced yet).
 *
 * @param {string} objectName Name of the object associated with the orbit
 * @param {string} currentSystem The current system being rendered
 * @param {Object} [options] Visibility values
 * @param {boolean} [options.orbitsVisible] Whether orbits are visible
 * @param {boolean} [options.objectVisible] Whether the object is visible
 * @returns {boolean} Whether the orbit should be visible
 */
export function shouldShowOrbit(
    objectName,
    currentSystem,
    { orbitsVisible, objectVisible } = {},
) {
    const areOrbitsShown = orbitsVisible ?? simulationState.orbitsShown;
    const isObjectHiddenInCurrentSystem = isObjectHidden(
        currentSystem,
        objectName,
    );
    const isObjectShown = objectVisible ?? !isObjectHiddenInCurrentSystem;

    return areOrbitsShown && isObjectShown;
}

/**
 * Get the line width for orbits, based on the current size of the canvas.
 *
 * The orbital line width is different for normal orbits and the Solar System orbits when
 * comparing to the Solar System.
 *
 * @param {boolean} isComparison Whether to get the width for a comparison orbit or a normal orbit
 * @returns The line width for orbits
 */
export function getOrbitLineWidth(isComparison) {
    const canvas = renderer.domElement;
    const canvasSize = Math.min(canvas.clientWidth, canvas.clientHeight);

    // The orbit line width as a proportion of the canvas size
    const proportion = isComparison
        ? COMPARISON_ORBIT_LINE_WIDTH_PROPORTION
        : ORBIT_LINE_WIDTH_PROPORTION;

    return Math.max(ORBIT_LINE_MIN_PIXEL_WIDTH, canvasSize * proportion);
}
