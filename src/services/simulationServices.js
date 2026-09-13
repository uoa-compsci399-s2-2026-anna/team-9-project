/**
 * Fetches the backend for star system information
 * 
 * @param {string} name Star system name
 */
export async function getSystemInfo(name) {
    const params = new URLSearchParams({
        system_name: name,
    });

    const response = await fetch(`/system_info?${params}`);
    if (!response.ok) {
        throw new Error(`Failed to get system info: ${response.status}`);
    }

    return await response.json();
}

/**
 * Fetches the backend for star system data at a specified time
 * 
 * @param {string} name Star system name
 * @param {number} t Timestamp in milliseconds since epoch
 */
export async function getSystemData(name, t) {
    // Returns a dict of systems, get the specific system
    const systemsInfoDict = await getMultipleSystemsData([name], t);
    return systemsInfoDict[name];
}

/**
 * Fetches the backend for multiple star systems' data at a specified time
 * 
 * @param {Array.<string>} names Star system names
 * @param {number} t Timestamp in milliseconds since epoch
 */
export async function getMultipleSystemsData(names, t) {
    const params = new URLSearchParams({
        t: t,
    });

    // Add each member of the list to the parameters
    names.forEach(name => params.append('system_names', name))

    const response = await fetch(`/system?${params}`);
    if (!response.ok) {
        throw new Error(`Failed to get system data: ${response.status}`);
    }

    return await response.json();
}
