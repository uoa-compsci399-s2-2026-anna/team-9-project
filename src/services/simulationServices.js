/**
 * Fetches the backend for star system data at a specified time
 * 
 * @param {string} name Star system name
 * @param {number} t Simulation time relative to simulation initialisation time
 */
export async function getSystemData(name, t) {
    const params = new URLSearchParams({
        system_name: name,
        t: t,
    });

    const response = await fetch(`/system?${params}`);
    console.log("done?");
    if (!response.ok) {
        throw new Error(`Failed to get system data: ${response.status}`);
    }

    return await response.json();
}
