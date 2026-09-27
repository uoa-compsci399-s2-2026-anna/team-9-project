import { MeshLineGeometry, MeshLineMaterial } from "three.meshline";
import * as THREE from "three";
import {
    calculateOrbitalPosition,
    calculateRotationMatrix,
} from "./simulationCalculations.js";
import { orbitalLines } from "./simulationRenderer.js";

const ORBIT_POINTS_COUNT = 360; // Number of points to approximate the ellipse

/**
 *
 * @param {string} name Object name
 * @param {Object} position Object position with attributes `x`, `y`, `z`
 * @param {Object} orbitalData Object orbital elements
 * @param {THREE.Group} group Group to add orbit line to
 * @param {string} colour CSS colour string for orbit line colour
 * @param {Number} lineWidth Orbit line width
 * @param {boolean} doShowOrbit Show orbit (visible) by default
 * @returns
 */
export function createOrUpdateOrbitalLine(
    name,
    position,
    orbitalData,
    group,
    colour,
    lineWidth,
    doShowOrbit,
) {
    const { a, e, inc, Omega, omega } = orbitalData;

    if (e === 1) return; // Parabolic orbits are not supported for now

    let line = orbitalLines.get(name);

    if (!line) {
        line = createEmptyOrbitLine(doShowOrbit, colour, lineWidth, e);

        group.add(line);
        orbitalLines.set(name, line);
    }

    updateOrbitLine(
        line,
        a,
        e,
        inc,
        Omega,
        omega,
        new THREE.Vector3(position.x, position.y, position.z),
    );
}

/**
 * @param {boolean} isVisible
 * @param {THREE.Color} colour
 * @param {Number} lineWidth
 * @param {Number} e Eccentricity of orbit
 * @returns {THREE.Mesh} Empty mesh line to render orbit (not populated with points)
 */
function createEmptyOrbitLine(isVisible, colour, lineWidth, e) {
    const geometry = new MeshLineGeometry();
    const material = new MeshLineMaterial({
        sizeAttenuation: false,
        transparent: true,
        resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
        lineWidth: lineWidth,
        color: colour,
    });

    // Modulate opacity of elliptical orbits
    if (e < 1) {
        material.alphaMap = createOrbitAlphaTexture();
        material.useAlphaMap = 1;
    }

    const line = new THREE.Mesh(geometry, material);

    // Render above habitable zone/other meshes to prevent z-fighting
    line.renderOrder = 1;

    line.visible = isVisible;

    return line;
}

/**
 * Update an orbit's geometry and moving opacity/width profile.
 * @param {THREE.Mesh} line
 * @param {Number} a
 * @param {Number} e
 * @param {Number} inc
 * @param {Number} Omega
 * @param {Number} omega
 * @param {THREE.Vector3} worldObjectPosition Position of the object in xyz space
 */
function updateOrbitLine(line, a, e, inc, Omega, omega, worldObjectPosition) {
    // Update the geometry of the line to match the orbital parameters
    const points = [];
    let thetaStart = 0;
    let thetaEnd = 2 * Math.PI;

    // Limit the angle range for hyperbolic orbits to its asymptotes
    if (e > 1) {
        const thetaLimit = Math.acos(-1 / e);
        const epsilon = 1e-10; // Avoid rendering issues at the asymptotes

        thetaStart = -thetaLimit + epsilon;
        thetaEnd = thetaLimit - epsilon;
    }

    const thetaStep = (thetaEnd - thetaStart) / ORBIT_POINTS_COUNT;

    /**
     * Rotation matrix: local (coordinate system of orbit plane) -> world
     */
    const rotationMatrix = calculateRotationMatrix(Omega, inc, omega);

    /**
     * World -> local (coordinate system of orbit plane)
     */
    const inverseRotationMatrix = rotationMatrix.clone().invert();

    /**
     * Position of object in local (orbit plane) coordinates
     */
    const localObjectPosition = worldObjectPosition.applyMatrix4(
        inverseRotationMatrix,
    );

    /**
     * Angle between positive x-axis (in local coordinates) and the point
     * (localPosition.x, localPosition.y) from the 2-argument arctangent.
     */
    let objectTheta = Math.atan2(localObjectPosition.y, localObjectPosition.x);
    if (objectTheta < 0) objectTheta += 2 * Math.PI;

    for (let theta = thetaStart; theta <= thetaEnd; theta += thetaStep) {
        const { x, y } = calculateOrbitalPosition(a, e, theta);
        points.push(x, y, 0);

        if (objectTheta > theta && objectTheta <= theta + thetaStep) {
            // Add a point on the exact coordinates of the object to prevent
            // sampling issues where the object's position falls between points.
            points.push(localObjectPosition.x, localObjectPosition.y, 0);
        }
    }

    if (e > 1) {
        // Add the last point at the end of the range to ensure the line reaches the asymptote
        const { x, y } = calculateOrbitalPosition(a, e, thetaEnd);
        points.push(x, y, 0);
    }

    if (e < 1) {
        /**
         * Proportion of a full revolution the object is from its starting
         * point/angle.
         */
        const objectProgress = THREE.MathUtils.clamp(
            (objectTheta - thetaStart) / (thetaEnd - thetaStart),
            0,
            1,
        );

        updateOrbitAlphaTexture(line.material.alphaMap, objectProgress);

        // Create or update the position attribute and widen the line at the object
        line.geometry.setPoints(points, (progress) => {
            /**
             * Proportion of a full revolution this point of `progress` is
             * from the object.
             *
             * At the object:
             * progress == objectProgress
             * ==> (objectProgress - progress + 1) % 1 == 1 % 1 == 0 == distance
             */
            const distance = (objectProgress - progress + 1) % 1;

            const ORBIT_LINE_MIN_WIDTH = 0.5;

            return Math.max(
                ORBIT_LINE_MIN_WIDTH,
                ORBIT_LINE_WIDTH_OPACITY_MODULATION_FUNCTION(distance),
            );
        });
    } else {
        // Display non-elliptical orbits as constant width
        line.geometry.setPoints(points);
    }

    // Rotate the line to match the orbital parameters
    line.quaternion.setFromRotationMatrix(rotationMatrix);

    return line;
}

/**
 * A function defining the curve/profile of the opacity/width modulation of
 * the orbit line.
 * @param {Number} distance Proportion of a full revolution this point is from
 * the object.
 * @returns Scale factor betwee 0 and 1 of opacity/line width.
 */
const ORBIT_LINE_WIDTH_OPACITY_MODULATION_FUNCTION = (distance) =>
    Math.max(0.2, 1 - distance);

const RGBA_CHANNEL_COUNT = 4;
const RGBA_MAX_VALUE = 255;

/**
 * @returns `THREE.DataTexture` of a RGBA alpha map filled with values of 255
 * (i.e. a fully opaque alpha map) based on the number of points in the simulation.
 */
function createOrbitAlphaTexture() {
    const size = ORBIT_POINTS_COUNT;
    const data = new Uint8Array(size * RGBA_CHANNEL_COUNT);
    data.fill(RGBA_MAX_VALUE);

    const texture = new THREE.DataTexture(data, size, 1, THREE.RGBAFormat);

    texture.needsUpdate = true;

    return texture;
}

/**
 *
 * @param {THREE.DataTexture} texture
 * @param {*} objectProgress
 */
function updateOrbitAlphaTexture(texture, objectProgress) {
    const { data, width } = texture.image;

    for (let i = 0; i < width; i++) {
        const progress = i / (width - 1);
        const distance = (objectProgress - progress + 1) % 1;
        const opacity = ORBIT_LINE_WIDTH_OPACITY_MODULATION_FUNCTION(distance);

        /**
         * Offset of red channel/byte
         */
        const offset = i * RGBA_CHANNEL_COUNT;

        /**
         * Offset of alpha channel/byte
         */
        const aplhaOffset = offset + 3;

        data[aplhaOffset] = Math.round(opacity * RGBA_MAX_VALUE);
    }

    texture.needsUpdate = true;
}
