import * as THREE from "three";

/**
 * Calculate the Cartesian coordinates of a point in an elliptical orbit.
 * @param {number} a Semi-major axis of the orbit
 * @param {number} e Eccentricity of the orbit
 * @param {number} theta True anomaly (angle from periapsis) in radians
 * @returns {Object} The x and y coordinates of the object's position in its orbit
 */
export function calculateOrbitalPosition(a, e, theta) {
    const r = (a * (1 - e**2)) / (1 + e*Math.cos(theta));
    const x = r * Math.cos(theta);
    const y = r * Math.sin(theta);
    return { x, y };
}

/**
 * Check if angleA is smaller than angleB, considering the circular nature of angles.
 * @param {number} angleA The first angle in radians
 * @param {number} angleB The second angle in radians
 * @returns {boolean} True if angleA is smaller than angleB, false otherwise
 */
function isAngleSmaller(angleA, angleB) {
    // Normalize angles to [0, 2π)
    const normalizedA = ((angleA % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const normalizedB = ((angleB % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);

    return normalizedA < normalizedB;
}

/**
 * Check if an angle is between two other angles, considering the circular nature of angles.
 * @param {number} angle The angle to check
 * @param {number} start The starting angle
 * @param {number} end The ending angle
 * @returns {boolean} True if the angle is between the two other angles, false otherwise
 */
export function isAngleBetween(angle, start, end) {
    if (isAngleSmaller(start, end)) {
        return isAngleSmaller(start, angle) && isAngleSmaller(angle, end);
    }
    // If the range wraps around 0,
    // return true if the angle is in (start, 2pi) or [0, end)
    return isAngleSmaller(start, angle) || isAngleSmaller(angle, end);
}

/**
 * Calculate the rotation matrix for an orbit based on its parameters.
 * R = Rz(Omega) * Rx(inc) * Rz(omega)
 * @param {number} Omega Longitude of the ascending node in radians
 * @param {number} inc Inclination of the orbit in radians
 * @param {number} omega Argument of periapsis in radians
 * @returns {THREE.Matrix4} The rotation matrix representing the orientation of the orbit
 */
export function calculateRotationMatrix(Omega, inc, omega) {
    const rotateAscendingNode = new THREE.Matrix4().makeRotationZ(Omega);
    const rotateInclination = new THREE.Matrix4().makeRotationX(inc);
    const rotatePeriapsis = new THREE.Matrix4().makeRotationZ(omega);

    return new THREE.Matrix4()
        .multiplyMatrices(rotateAscendingNode, rotateInclination)
        .multiply(rotatePeriapsis);
}

/**
 * Calculate the apoapsis (farthest point in orbit) for an object given its semi-major axis and eccentricity.
 * @param {number} a Semi-major axis of the orbit
 * @param {number} e Eccentricity of the orbit
 * @returns {number} The apoapsis distance
 */
function calculateApoapsis(a, e) {
    return a * (1 + e);
}

/**
 * Calculate the periapsis (closest point in orbit) for an object given its semi-major axis and eccentricity.
 * @param {number} a Semi-major axis of the orbit
 * @param {number} e Eccentricity of the orbit
 * @returns {number} The periapsis distance
 */
function calculatePeriapsis(a, e) {
    return a * (1 - e);
}

/**
 * Calculate the maximum apoapsis distance among all objects in the system.
 * @param {Array} orbitalDataValues Array of orbital data values for all objects
 * @returns {number} The maximum apoapsis distance
 */
export function calculateMaxApoapsis(orbitalDataValues) {
    return Math.max(
        ...orbitalDataValues.map(
            ({ a, e }) => calculateApoapsis(a, e)
        ),
        0 // Ensure the result is non-negative
    );
}

/**
 * Calculate the maximum periapsis distance among all objects in the system.
 * @param {Array} orbitalDataValues Array of orbital data values for all objects
 * @returns {number} The maximum periapsis distance
 */
export function calculateMaxPeriapsis(orbitalDataValues) {
    return Math.max(
        ...orbitalDataValues.map(
            ({ a, e }) => calculatePeriapsis(a, e)
        ),
        0 // Ensure the result is non-negative
    );
}

/**
 * Calculate the distance of the camera from the target based on the view radius.
 * The camera distance is calculated to ensure that the entire view radius fits within the camera's field of view.
 * 
 * @param {number} fov The field of view of the camera in degrees
 * @param {number} viewRadius The radius of the view to fit within the camera's field of view
 * @returns {number} The calculated camera distance
 */
export function calculateCameraDistance(fov, viewRadius) {
    const fovRad = fov * (Math.PI / 180);
    return viewRadius / Math.tan(fovRad / 2); // Calculate the distance to fit the view radius
}

/**
 * Calculate the average normal vector of the orbital planes of all objects in the system.
 * 
 * @param {Array} orbitalDataValues Array of orbital data values for all objects
 * @returns {THREE.Vector3} The calculated average normal
 */
export function calculateAverageNormal(orbitalDataValues) {
    const averageNormal = new THREE.Vector3();
    let reference = null;

    for (const { inc, Omega } of orbitalDataValues) {
        const normal = new THREE.Vector3( // Normal vector of the orbital plane
            Math.sin(inc) * Math.sin(Omega),
            -Math.sin(inc) * Math.cos(Omega),
            Math.cos(inc)
        );

        // Use the first normal vector as a reference.
        // Subsequent normal vectors are negated if they point opposite to it.
        // Note: This has undesirable effects if the first orbital plane differs significantly from the others
        // TODO: Consider a more robust approach
        if (reference && normal.dot(reference) < 0) {
            normal.negate();
        } else if (!reference) {
            reference = normal.clone();
        }

        averageNormal.add(normal);
    }

    return averageNormal.normalize();
}

/**
 * Check if two vectors are parallel.
 * @param {THREE.Vector3} vectorA The first vector
 * @param {THREE.Vector3} vectorB The second vector
 * @param {number} tolerance The tolerance for the dot product
 * @returns {boolean} True if the vectors are parallel, false otherwise
 */
function areParallel(vectorA, vectorB, tolerance = 1e-10) {
    const crossProduct = new THREE.Vector3()
        .crossVectors(vectorA, vectorB);

    return crossProduct.length() < tolerance;
}

/**
 * Calculate the default camera position, at 1 degree from the up vector.
 * This ensures the camera direction is not parallel to the up vector.
 * Otherwise, camera orientation would not be uniquely determined by the position.
 * 
 * @param {THREE.Vector3} upVector The up vector for the camera
 * @param {number} cameraDistance The distance of the camera from the target
 * @returns {THREE.Vector3} The calculated default camera position
 */
export function calculateDefaultCameraPosition(upVector, cameraDistance) {
    const angleFromUp = Math.PI / 180; // 1 degree in radians

    // Get an arbitrary vector that is not parallel to the up vector
    // This will be used to calculate a vector that is perpendicular to the up vector
    let arbitraryVector = new THREE.Vector3(1, 0, 0);
    if (areParallel(upVector, arbitraryVector)) {
        arbitraryVector = new THREE.Vector3(0, 1, 0);
    }

    // Calculate a vector perpendicular to the up vector using the cross product
    // This vector will be used to calculate the camera direction
    const perpendicularVector = new THREE.Vector3()
        .crossVectors(upVector, arbitraryVector)
        .normalize();

    // Calculate the direction of the camera based on the angle from the up vector
    const towardUpVector = upVector
        .clone()
        .multiplyScalar(Math.cos(angleFromUp));
    const towardPerpendicular = perpendicularVector
        .clone()
        .multiplyScalar(Math.sin(angleFromUp));
    const cameraDirection = towardUpVector
        .add(towardPerpendicular)
        .normalize();

    return cameraDirection.multiplyScalar(cameraDistance);
}

/**
 * Calculate the distance from the camera to the target projection on the reference plane.
 * @param {THREE.Vector3} cameraPosition The position of the camera
 * @param {THREE.Vector3} targetPosition The position of the target
 * @returns {number} The calculated distance
 */
export function calculateCameraDistanceToTargetProjection(cameraPosition, targetPosition) {
    const targetProjection = new THREE.Vector3(targetPosition.x, targetPosition.y, 0);
    return cameraPosition.distanceTo(targetProjection);
}

/**
 * Round a number to the closest value in the set {1, 2, 5} multiplied by a power of 10.
 * @param {number} x The number to round
 * @returns {number} The rounded number
 */
function roundToNiceNumber(x) {
    if (x <= 0) {
        throw new Error("Input must be positive");
    }

    const exponent = Math.floor(Math.log10(x));
    const magnitude = Math.pow(10, exponent);

    const normalized = x / magnitude;
    let closest;

    if (normalized < 1.5) {
        closest = 1;
    } else if (normalized < 3.5) {
        closest = 2;
    } else if (normalized < 7.5) {
        closest = 5;
    } else {
        closest = 10;
    }

    return closest * magnitude;
}

/**
 * Calculate the size of each division in the reference grid.
 * @param {number} fov The field of view of the camera in degrees
 * @param {number} cameraDistanceToTargetProjection The distance from the camera to the target projection on the reference plane
 * @param {number} divisionsInView The number of divisions visible in the view
 * @returns {number} The calculated size of each division in the reference grid
 */
export function calculateReferenceGridDivisionSize(
    fov,
    cameraDistanceToTargetProjection,
    divisionsInView
) {
    const fovRad = fov * (Math.PI / 180);
    const viewRadius = cameraDistanceToTargetProjection * Math.tan(fovRad / 2);
    const divisionSize = 2*viewRadius / divisionsInView;
    return roundToNiceNumber(divisionSize);
}
