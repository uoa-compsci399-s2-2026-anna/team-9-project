import * as THREE from "three";
import { MeshLineGeometry, MeshLineMaterial } from "three.meshline";

import { settings } from "../../shared/settingsState.js";
import {
    simulationState,
    comparingToSolarSystem,
    isObjectHidden,
    isObjectHiddenByDefault,
} from "../../shared/simulationState.js";
import { renderer } from "../renderers.js";
import { orbitalLines, solarSystemGroup } from "./scene.js";
import {
    TWO_PI,
    calculateOrbitalPosition,
    isAngleBetween,
    calculateProgressDistance,
    calculateOrbitRotationMatrix,
} from "../calculations.js";
import { getFadedColour } from "../themes.js";

const ORBIT_POINTS_COUNT = 360; // Number of points to approximate the ellipse

// Orbit line widths as a proportion of the canvas size (the smaller of the canvas width and height)
const ORBIT_LINE_WIDTH_PROPORTION = 0.025;
const COMPARISON_ORBIT_LINE_WIDTH_PROPORTION = 0.02;
const ORBIT_LINE_MIN_PIXEL_WIDTH = 1;

const ORBIT_LINE_MIN_OPACITY = 0.2;
const ORBIT_LINE_MIN_WIDTH = 0.5;

export const COMPARISON_ORBIT_LINE_OPACITY = 0.8;
const ORBIT_LINE_PROJECTION_OPACITY = 0.1;

const RGBA_CHANNEL_COUNT = 4;
const RGBA_MAX_VALUE = 255;

/**
 * A function defining the curve/profile of the opacity/width modulation of
 * the orbit line.
 * @param {Number} distance Proportion of a full revolution this point is from
 * the object.
 * @returns Scale factor betwee 0 and 1 of opacity/line width.
 */
const ORBIT_LINE_OPACITY_MODULATION_FUNCTION = (distance) =>
    Math.max(ORBIT_LINE_MIN_OPACITY, 1 - distance);

const ORBIT_LINE_WIDTH_MODULATION_FUNCTION = (distance) =>
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
function createOpaqueOrbitAlphaTexture() {
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
function updateOrbitAlphaTexture(texture, objectProgress, isElliptical = true) {
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

/**
 * If the target orbit does not exist, then its orbital line is created with the given orbital data.
 * If the target orbital line does exist, then it is updated.
 *
 * The orbital line is coloured to match its object.
 *
 * @param {string} currentSystem Name of the current system
 * @param {string} name Name of the object associated with the orbital line
 * @param {Object} orbitalData Orbital data for the line
 * @param {THREE.Group} group The group to add the orbital line to
 * @param {string} colour CSS colour string used for this orbit's line
 */
export function createOrUpdateOrbitalLine(
    currentSystem,
    name,
    orbitalData,
    group,
    colour,
) {
    // Don't create orbital line in the comparison overlay
    // for objects that are hidden by default in the Solar System
    if (
        comparingToSolarSystem &&
        group === solarSystemGroup &&
        isObjectHiddenByDefault("Solar System", name)
    ) {
        return;
    }

    const { a, e, inc, Omega, omega, f } = orbitalData;

    if (e === 1) return; // Parabolic orbits are not supported for now

    const isElliptical = e < 1;

    let line = orbitalLines.get(name);

    if (!line) {
        const canvas = renderer.domElement;
        const geometry = new MeshLineGeometry();

        const material = new MeshLineMaterial({
            // Remain constant size (do not grow in size as user zooms in)
            sizeAttenuation: false,
            transparent: true,
            resolution: new THREE.Vector2(
                window.innerWidth,
                window.innerHeight,
            ),
        });

        if (group === solarSystemGroup) {
            const comparisonColour = getFadedColour(
                colour,
                COMPARISON_ORBIT_LINE_OPACITY,
            );

            material.lineWidth = getOrbitLineWidth(true);
            material.color.set(comparisonColour);
        } else {
            material.lineWidth = getOrbitLineWidth(false);
            material.color.set(colour);
        }

        material.alphaMap = createOpaqueOrbitAlphaTexture();
        material.useAlphaMap = 1;

        material.resolution.set(canvas.clientWidth, canvas.clientHeight);

        line = new THREE.Mesh(geometry, material);

        // Render above habitable zone to prevent z fighting
        line.renderOrder = 1;

        if (group === solarSystemGroup) {
            line.visible = comparingToSolarSystem;
        } else {
            line.visible = shouldShowOrbit(name, currentSystem);
        }

        group.add(line);
        orbitalLines.set(name, line);
    }

    // Update the geometry of the line to match the orbital parameters
    const points = [];
    let thetaStart = 0;
    let thetaEnd = TWO_PI;

    // Limit the angle range for hyperbolic orbits to its asymptotes
    if (!isElliptical) {
        const thetaLimit = Math.acos(-1 / e);
        const epsilon = 1e-10; // Avoid rendering issues at the asymptotes

        thetaStart = -thetaLimit + epsilon;
        thetaEnd = thetaLimit - epsilon;
    }

    // Calculate the step size for theta.
    // ORBIT_POINTS_COUNT - 2 is used as:
    // * A point is added at the object's position
    // * The last point is added separately
    const thetaStep = (thetaEnd - thetaStart) / (ORBIT_POINTS_COUNT - 2);

    let objectIndex = 0;
    for (let i = 0; i < ORBIT_POINTS_COUNT - 2; i++) {
        const theta = thetaStart + i * thetaStep;
        const { x, y } = calculateOrbitalPosition(a, e, theta);
        points.push(x, y, 0);

        if (isAngleBetween(f, theta, theta + thetaStep)) {
            // Add a point on the exact coordinates of the object to prevent
            // sampling issues where the object's position falls between points.
            const { x, y } = calculateOrbitalPosition(a, e, f);
            points.push(x, y, 0);
            objectIndex = i + 1;
        }
    }

    // Add the last point at the end of the range
    const { x, y } = calculateOrbitalPosition(a, e, thetaEnd);
    points.push(x, y, 0);

    /**
     * Proportion of a full revolution the object is from its starting
     * point/angle.
     */
    const objectProgress = objectIndex / (ORBIT_POINTS_COUNT - 1);

    updateOrbitAlphaTexture(
        line.material.alphaMap,
        objectProgress,
        isElliptical,
    );

    // Create or update the position attribute and widen the line at the object
    line.geometry.setPoints(points, (progress) => {
        /**
         * setPoints takes a callback which has a `progress` parameter which defines
         * the progress across the line (as a proportion, in [0, 1]), and returns
         * the PROPORTION of the original line width as defined for the material
         * to define the line width at that point (`progress`) along the line.
         */

        const FULL_WIDTH_PROPORTION = 1;

        if (settings.orbitLines == "Solid") {
            return FULL_WIDTH_PROPORTION;
        }

        const distance = calculateProgressDistance(
            progress,
            objectProgress,
            isElliptical,
        );

        if (settings.orbitLines === "Tapered") {
            return ORBIT_LINE_WIDTH_MODULATION_FUNCTION(distance);
        } else {
            return FULL_WIDTH_PROPORTION;
        }
    });

    // Rotate the line to match the orbital parameters
    const rotationMatrix = calculateOrbitRotationMatrix(Omega, inc, omega);
    line.quaternion.setFromRotationMatrix(rotationMatrix);

    createOrUpdateOrbitalLineProjection(line);
}

/**
 * Creates (if it doesn't exist) or updates the existing orbit line projection
 * lines. These are the lines which are projected from the orbit line to the
 * reference plane.
 *
 * This function does this by:
 * 1. Copying the appearance of `line` (colour, transparency, render order, etc.)
 * 2. Adding the projection lines as a child of the original line.
 * 3. Calculating the projection line coordinates in world space
 * @param {THREE.Mesh} line A meshline representing an orbit line.
 */
function createOrUpdateOrbitalLineProjection(line) {
    /**
     * Array of points [x, y, z, x, ...] which define `line`.
     */
    const points = line.geometry.attributes.position.array;

    let projectionLine = line.userData.projectionLine;
    if (!projectionLine) {
        projectionLine = new THREE.LineSegments(
            new THREE.BufferGeometry(),
            new THREE.LineBasicMaterial({
                color: line.material.color,
                transparent: true,
                opacity: ORBIT_LINE_PROJECTION_OPACITY,
                depthWrite: false,
            }),
        );
        projectionLine.renderOrder = line.renderOrder;

        // Add the projection line as custom user data on the original orbit
        // line.
        line.userData.projectionLine = projectionLine;

        // Add the projection line as a child of the original orbit line.
        line.add(projectionLine);
    }

    const referencePlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

    // Get orbit line -> world transformation matrix and the inverse.
    line.updateWorldMatrix(true, false);
    const orbitToWorld = line.matrixWorld;
    const worldToOrbit = orbitToWorld.clone().invert();

    /**
     * Array of the vectors to the points to be rendered for projections from
     * the orbit line to the reference plane.
     *
     * Elements of this alternate between the point on the orbit line, and its
     * projection on the reference plane.
     */
    const projectionPoints = [];

    /**
     * The number of dimensions per position coordinate.
     */
    const COORDINATES_DIMENSION_COUNT = 3;

    // Build the array of projected points. Here, we ignore the last two xyz
    // coordinates. This is because `points` contains two 'special' points: one
    // is the point of the exact position of the object. The other is a duplicated
    // point on the start/end of the line. Thus, we skip the last two points in
    // the array to account for this.
    for (
        let i = 0;
        i < points.length - 2 * COORDINATES_DIMENSION_COUNT;
        i += COORDINATES_DIMENSION_COUNT
    ) {
        /**
         * The vector to the point in the orbit, in orbit line space coordinates.
         */
        const orbitPoint = new THREE.Vector3(
            points[i],
            points[i + 1],
            points[i + 2],
        );

        /**
         * Vector to the point in the orbit, in world coordinates.
         */
        const orbitPointWorld = orbitPoint.clone().applyMatrix4(orbitToWorld);

        /**
         * Vector to the projection of `orbitPointWorld` on the reference plane,
         * in world coordinates.
         */
        const projectedWorldPoint = new THREE.Vector3();
        referencePlane.projectPoint(orbitPointWorld, projectedWorldPoint);

        // Transform to convert back to orbit line space coordinates.
        const projectedOrbitPoint =
            projectedWorldPoint.applyMatrix4(worldToOrbit);

        projectionPoints.push(orbitPoint, projectedOrbitPoint);
    }

    projectionLine.geometry.setFromPoints(projectionPoints);
}
