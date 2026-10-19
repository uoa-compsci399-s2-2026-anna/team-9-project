import * as THREE from "three";
import { settings } from "../../shared/settingsState.js";
import {
    simulationState,
    isObjectHidden,
} from "../../shared/simulationState.js";
import { renderer } from "../renderers.js";
import { calculateProgressDistance } from "../calculations.js";

export const ORBIT_POINTS_COUNT = 360; // Number of points to approximate the ellipse

// Orbit line widths as a proportion of the canvas size (the smaller of the canvas width and height)
const ORBIT_LINE_WIDTH_PROPORTION = 0.025;
const COMPARISON_ORBIT_LINE_WIDTH_PROPORTION = 0.02;
const ORBIT_LINE_MIN_PIXEL_WIDTH = 1;

const ORBIT_LINE_MIN_OPACITY = 0.2;
const ORBIT_LINE_MIN_WIDTH = 0.5;

const RGBA_CHANNEL_COUNT = 4;
const RGBA_MAX_VALUE = 255;

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

/**
 * @returns `THREE.DataTexture` of a RGBA alpha map filled with values of 255
 * (i.e. a fully opaque alpha map) based on the number of points in the simulation.
 */
export function createOpaqueOrbitAlphaTexture() {
    const data = new Uint8Array(
        (ORBIT_POINTS_COUNT - 1) * RGBA_CHANNEL_COUNT, // There is one less segment than points
    );
    data.fill(RGBA_MAX_VALUE);

    /**
     * Create (ORBIT_POINTS_COUNT - 1) x 1 texture (i.e. a 1D texture) for an opacity
     * map. This is in RGBA format, so each 'point' of the texture is
     * represented by 4 bytes: a red, green, blue, and alpha channel.
     */
    const texture = new THREE.DataTexture(
        data,
        ORBIT_POINTS_COUNT - 1,
        1,
        THREE.RGBAFormat,
    );

    texture.needsUpdate = true;

    return texture;
}

/**
 * Updates the given alpha texture map based on the new value of
 * `objectProgress` (i.e. the new position of the object).
 *
 * Used so that as the object moves around its orbit, the opacity of the orbit
 * updates correctly so that it is most opaque at the object and gets fainter
 * (or as defined by the opacity modulation function).
 *
 * @param {THREE.Texture} texture An alpha texture map as a 1 x N byte array in
 * RGBA format, where each 4 bytes represents an RGBA value for that point in
 * the texture.
 * @param {Number} objectProgress Proportion of a full revolution the object is
 * from its starting point/angle (in interval [0, 1])
 * @param {boolean} [isElliptical=true] Whether the orbit is elliptical
 */
export function updateOrbitAlphaTexture(
    texture,
    objectProgress,
    isElliptical = true,
) {
    /**
     * `texture.image` is an object containing fields `data` (the actual byte
     * array of the texture), `width` (the number of bytes) in the 'width'
     * dimension, and `height`. Here we get the raw byte array and the width
     * of the texture.
     */

    const { data: textureArray, width: textureArraySize } = texture.image;

    // Iterate over the raw texture byte array
    for (let i = 0; i < textureArraySize; i++) {
        /**
         * Offset of red channel/byte
         */
        const offset = i * RGBA_CHANNEL_COUNT;

        /**
         * Offset of alpha channel/byte. Here we add 3 because `offset` is the
         * offset of the byte of the red channel. To get the offset of the alpha
         * channel, we add 3.
         *
         * [..., red, green, blue, alpha, red, ...]
         */
        const alphaOffset = offset + 3;

        if (settings.orbitLines === "Solid") {
            textureArray[alphaOffset] = RGBA_MAX_VALUE;
            continue;
        }

        /**
         * Proportion of array traversed (in interval [0, 1]). Max value of `i`
         * is `textureArraySize - 1`, hence `(textureArraySize - 1)`.
         */
        const progress = i / (textureArraySize - 1);

        const distance = calculateProgressDistance(
            progress,
            objectProgress,
            isElliptical,
        );

        const opacity = ORBIT_LINE_OPACITY_MODULATION_FUNCTION(distance);

        textureArray[alphaOffset] = Math.round(opacity * RGBA_MAX_VALUE);
    }

    texture.needsUpdate = true;
}
