import { getVisibleReferenceOrbitalDataValues } from "./referenceSystemData.js";
import {
    calculateMaxApoapsis,
    calculateMaxPeriapsis,
} from "./simulationCalculations.js";

export const VIEW_RADIUS_MULTIPLIER = 1.3;

// The view radius when all objects are set to default visibility
export let currentSystemDefaultViewRadius;
export let solarSystemDefaultViewRadius;

/**
 * Get the view radius for a given system based on the maximum apoapsis of all visible objects.
 *
 * @param {string} system The name of the system
 * @param {boolean} [useDefault=false] Whether to check default visibility instead of current visibility
 * @returns {Promise<number>} The view radius for the system
 */
export async function getViewRadiusForSystem(system, useDefault = false) {
    const orbitalDataValues = await getVisibleReferenceOrbitalDataValues(
        system,
        useDefault,
    );
    const maxApoapsis = calculateMaxApoapsis(orbitalDataValues);
    const maxPeriapsis = calculateMaxPeriapsis(orbitalDataValues); // To account for hyperbolic orbits
    return Math.max(maxApoapsis, maxPeriapsis) * VIEW_RADIUS_MULTIPLIER;
}

/**
 * Set the default view radii for the current system and the Solar System.
 *
 * @param {string} currentSystem The name of the current system
 * @returns {Promise<void>}
 */
export async function setDefaultViewRadii(currentSystem) {
    currentSystemDefaultViewRadius = await getViewRadiusForSystem(
        currentSystem,
        true,
    );
    solarSystemDefaultViewRadius = await getViewRadiusForSystem(
        "Solar System",
        true,
    );
}
