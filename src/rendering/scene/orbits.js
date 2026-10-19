import {
    simulationState,
    isObjectHidden,
} from "../../shared/simulationState.js";

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
