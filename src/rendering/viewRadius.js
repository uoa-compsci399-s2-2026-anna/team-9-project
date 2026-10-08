import { getVisibleReferenceOrbitalDataValues } from "./referenceSystemData.js";
import {
    calculateMaxApoapsis,
    calculateMaxPeriapsis,
} from "./simulationCalculations.js";

const VIEW_RADIUS_MULTIPLIER = 1.3;

export let viewRadius;

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
async function getViewRadiusForSystem(system, useDefault = false) {
    const orbitalDataValues = await getVisibleReferenceOrbitalDataValues(
        system,
        useDefault,
    );
    const maxApoapsis = calculateMaxApoapsis(orbitalDataValues);
    const maxPeriapsis = calculateMaxPeriapsis(orbitalDataValues); // To account for hyperbolic orbits
    return Math.max(maxApoapsis, maxPeriapsis) * VIEW_RADIUS_MULTIPLIER;
}

/**
 * Update the view radius based on the current system, whether the Solar System is being compared,
 * and whether the habitable zone is shown.
 *
 * The view radius is set to the maximum of the current system's view radius,
 * the Solar System's view radius (if comparing), and the habitable zone's end radius (if shown).
 *
 * @param {string} currentSystem The name of the current system
 * @param {boolean} comparingToSolarSystem Whether the Solar System is being compared
 * @param {boolean} habitableZoneShown Whether the habitable zone is shown
 */
export async function updateViewRadius(
    currentSystem,
    comparingToSolarSystem,
    habitableZoneShown,
) {
    const viewRadiusForCurrentSystem =
        await getViewRadiusForSystem(currentSystem);

    let newViewRadius = viewRadiusForCurrentSystem;

    if (comparingToSolarSystem) {
        newViewRadius = Math.max(newViewRadius, solarSystemDefaultViewRadius);
    }

    if (habitableZoneShown && habitableZone) {
        const viewRadiusForHabitableZone =
            habitableZone.end * VIEW_RADIUS_MULTIPLIER;
        newViewRadius = Math.max(newViewRadius, viewRadiusForHabitableZone);
    }

    viewRadius = newViewRadius;
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
