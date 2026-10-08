import { getSystemInfo } from "../services/simulationServices.js";

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
