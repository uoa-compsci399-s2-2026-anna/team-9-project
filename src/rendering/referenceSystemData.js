import { getSystemInfo } from "../services/simulationServices.js";

const referenceSystemData = new Map(); // Cache for orbital data at the reference timestamp

export function setReferenceSystemData(system, data) {
    referenceSystemData.set(system, data);
}

/**
 * Get the reference system data for a given system.
 * If the data is not in the cache, it will be fetched and stored.
 *
 * @param {string} system The name of the system
 * @returns {Promise<Object>} The reference system data
 */
export async function getReferenceSystemData(system) {
    if (!referenceSystemData.has(system)) {
        const systemInfo = await getSystemInfo(system);
        referenceSystemData.set(system, systemInfo["reference"]);
    }
    return referenceSystemData.get(system);
}
