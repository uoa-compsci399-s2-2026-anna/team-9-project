import { isObjectHiddenByDefault } from "../shared/simulationState.js";
import { getReferenceSystemData } from "./referenceSystemData.js";
import { currentSystemDefaultViewRadius } from "./viewRadius.js";
import { calculatePeriapsis } from "./calculations.js";

const OBJECT_SIZE_MULTIPLIER = 0.002;
const HITBOX_PADDING_MULTIPLIER = 0.0005;

export let objectSize;
export let hitboxPadding;

export let currentSystemColours;
export let objectTypes;

// Periapsis of the innermost default visible orbit
export let innermostPeriapsis = Infinity;

/**
 * Set the object size and hitbox padding based on the current system's default view radius.
 */
export function setObjectSize() {
    objectSize = currentSystemDefaultViewRadius * OBJECT_SIZE_MULTIPLIER; // Set the object size
    hitboxPadding = currentSystemDefaultViewRadius * HITBOX_PADDING_MULTIPLIER; // Set the hitbox padding size
}

/**
 * Get the configured colour for an object in the current system, appropriate for the
 * current light/dark theme. Falls back to black in light mode and white in dark mode if the
 * object has no configured colour, or if currentSystemColours hasn't been populated yet.
 *
 * @param {string} name Name of the object
 * @param {boolean} isDarkMode Whether to use the dark mode variant
 * @returns {string} CSS colour string
 */
export function getCurrentSystemColour(name, isDarkMode) {
    const variant = isDarkMode ? "dark" : "light";
    const fallbackColour = isDarkMode ? "white" : "black";
    return currentSystemColours?.[name]?.[variant] ?? fallbackColour;
}

/**
 * Set the colours of objects in the current system based on the provided object data.
 * @param {Object} objectData The object data containing colour information
 */
export function setCurrentSystemColours(objectData) {
    currentSystemColours = Object.fromEntries(
        Object.entries(objectData ?? {}).map(([name, data]) => [
            name,
            data.colour,
        ]),
    );
}

/**
 * Set the types of objects in the current system based on the provided object data.
 * @param {Object} objectData The object data containing type information
 */
export function setObjectTypes(objectData) {
    objectTypes = Object.fromEntries(
        Object.entries(objectData ?? {}).map(([name, data]) => [
            name,
            data.type,
        ]),
    );
}

/**
 * For the given orbital data, get the name of the star with the smallest periapsis.
 *
 * @param {Object} orbitalData Map of object name to orbital data
 * @returns The name of the star with the smallest periapsis
 */
function findSmallestPeriapsisStarName(orbitalData) {
    let starName = null;
    let smallestPeriapsis = Infinity;

    for (const [name, orbit] of Object.entries(orbitalData)) {
        if (objectTypes[name] !== "star") {
            continue;
        }

        const periapsis = calculatePeriapsis(orbit.a, orbit.e);

        if (periapsis < smallestPeriapsis) {
            smallestPeriapsis = periapsis;
            starName = name;
        }
    }

    return starName;
}

/**
 * Finds the smallest periapsis (closest point to the centre) across all orbits whose
 * corresponding object is visible by default, excluding the innermost star and the
 * Sun (if the Solar System is being compared to).
 *
 * @param {string} currentSystem The name of the current system
 * @param {boolean} comparing Whether the Solar System is being compared to or not
 */
export async function updateInnermostPeriapsis(currentSystem, comparing) {
    // Don't check the periapsis of the innermost star in the current system
    const systems = [
        {
            system: currentSystem,
            getExcludedName: (orbitalData) =>
                findSmallestPeriapsisStarName(orbitalData),
        },
    ];

    if (comparing) {
        // Don't check the periapsis of the Sun
        systems.push({
            system: "Solar System",
            getExcludedName: () => "Sun",
        });
    }

    let smallest = Infinity;

    for (const { system, getExcludedName } of systems) {
        const data = await getReferenceSystemData(system);
        const excludedName = getExcludedName(data.orbital_data);

        for (const [name, orbit] of Object.entries(data.orbital_data)) {
            if (
                name === excludedName ||
                isObjectHiddenByDefault(system, name)
            ) {
                continue;
            }

            const periapsis = calculatePeriapsis(orbit.a, orbit.e);
            smallest = Math.min(smallest, periapsis);
        }
    }

    innermostPeriapsis = smallest;
}
