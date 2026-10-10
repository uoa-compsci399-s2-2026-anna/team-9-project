import { getSystemInfo } from "../services/simulationServices.js";
import {
    isObjectHidden,
    isObjectHiddenByDefault,
} from "../shared/simulationState.js";

const allReferenceSystemData = new Map(); // Cache for orbital data at the reference timestamp

/**
 * Set the reference system data for a given system in the cache.
 *
 * @param {string} system The name of the system
 * @param {Object} data The reference system data
 */
export function setReferenceSystemData(system, data) {
    allReferenceSystemData.set(system, data);
}

/**
 * Get the reference system data for a given system.
 * If the data is not in the cache, it will be fetched and stored.
 *
 * @param {string} system The name of the system
 * @returns {Promise<Object>} The reference system data
 */
export async function getReferenceSystemData(system) {
    if (!allReferenceSystemData.has(system)) {
        const systemInfo = await getSystemInfo(system);
        setReferenceSystemData(system, systemInfo["reference"]);
    }
    return allReferenceSystemData.get(system);
}

/**
 * Get the orbital data values for all objects in the given system that are not hidden.
 *
 * @param {string} system The name of the system
 * @param {Object} orbitalData Map of object name to orbital data
 * @param {boolean} [useDefault=false] Whether to check default visibility instead of current visibility
 * @returns {Object[]} Orbital data values for visible objects only
 */
function getVisibleOrbitalDataValues(system, orbitalData, useDefault = false) {
    const isHidden = useDefault ? isObjectHiddenByDefault : isObjectHidden;

    return Object.keys(orbitalData)
        .filter((name) => !isHidden(system, name))
        .map((name) => orbitalData[name]);
}

/**
 * Get the orbital data values for all objects in the given system at the reference timestamp that are not hidden.
 *
 * @param {string} system The name of the system
 * @param {boolean} [useDefault=false] Whether to check default visibility instead of current visibility
 * @returns {Promise<Object[]>} Orbital data values for visible objects only
 */
export async function getVisibleReferenceOrbitalDataValues(
    system,
    useDefault = false,
) {
    const referenceData = await getReferenceSystemData(system);
    return getVisibleOrbitalDataValues(
        system,
        referenceData.orbital_data,
        useDefault,
    );
}
