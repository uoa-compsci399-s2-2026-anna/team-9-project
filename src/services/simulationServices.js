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
    const params = new URLSearchParams({
        system_name: name,
        t: t,
    });

    const response = await fetch(`/system?${params}`);
    if (!response.ok) {
        throw new Error(`Failed to get system data: ${response.status}`);
    }

    return await response.json();
}
