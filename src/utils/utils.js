/**
 * Converts a given amount of time into seconds
 *
 * @param {number} time - The amount of time to convert
 * @param {string} unit The time unit: "hour", "day", "week", "month", or "year"
 * @returns {number} The equivalent amount of time in seconds
 */
export function timeToSeconds(time, unit) {
    const units = {
        hour: 3600, // 60 * 60
        day: 86400, // 24 * 60 * 60
        week: 604800, // 7 * 24 * 60 * 60
        month: 2629800, // (365.25 / 12) * 24 * 60 * 60 (Julian month)
        year: 31557600, // 365.25 * 24 * 60 * 60 (Julian year)
    }

    if (!(unit in units)) {
        throw new Error(`Invalid time unit: ${unit}`);
    }

    return time * units[unit];
}
