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
 * Calculate the maximum apoapsis distance among all objects in the system.
 * @param {Array} orbitalDataValues Array of orbital data values for all objects
 * @returns {number} The maximum apoapsis distance
 */
export function calculateMaxApoapsis(orbitalDataValues) {
    return Math.max(
        ...orbitalDataValues.map(
            ({ a, e }) => calculateApoapsis(a, e)
        )
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
 * Calculate the average up vector for the camera based on the orbital planes of all objects.
 * The up vector is calculated as the average of the normal vectors of all orbital planes.
 * 
 * @param {Array} orbitalDataValues Array of orbital data values for all objects
 * @returns {THREE.Vector3} The calculated up vector
 */
export function calculateUpVector(orbitalDataValues) {
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

function areParallel(vectorA, vectorB, tolerance = 1e-10) {
    const crossProduct = new THREE.Vector3()
        .crossVectors(vectorA, vectorB);

    return crossProduct.length() < tolerance;
}

/**
 * Calculate the default camera position at a specified angle from the up vector.
 * This ensures the camera direction is not parallel to the up vector and gives a unique camera orientation.
 * 
 * @param {THREE.Vector3} upVector The up vector for the camera
 * @param {number} cameraDistance The distance of the camera from the target
 * @param {number} angleFromUp The angle from the up vector in radians
 * @returns {THREE.Vector3} The calculated default camera position
 */
export function calculateDefaultCameraPosition(upVector, cameraDistance, angleFromUp) {
    let arbitraryVector = new THREE.Vector3(1, 0, 0);

    // Use a different arbitrary vector if it is parallel to the up vector
    if (areParallel(upVector, arbitraryVector)) {
        arbitraryVector = new THREE.Vector3(0, 1, 0);
    }

    // Calculate a vector perpendicular to the upVector using the cross product
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
