/**
 * Fetches the backend for star system data at a specified time
 * 
 * @param {string} name Star system name
 * @param {number} t Simulation time relative to app startup time
 */
export async function getSystemData(name, t) {
    const params = new URLSearchParams({
        name: name,
        t: t,
    });

    const response = await fetch(`/system?${params}`);
    if (!response.ok) {
        throw new Error(`Failed to get system data: ${response.status}`);
    }

    return await response.json();
}
