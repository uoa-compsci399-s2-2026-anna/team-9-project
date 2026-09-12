import { DateTime } from "luxon";

/**
 * Converts a given amount of time (time + unit) into milliseconds.
 *
 * @param {number} time - The amount of time to convert
 * @param {string} unit The time unit: "hour", "day", "week", "month", or "year"
 * @returns {number} The equivalent amount of time in milliseconds
 */
export function timeToMilliseconds(time, unit) {
    const units = {
        hour: 3600000, // 60 * 60 * 1000
        day: 86400000, // 24 * 60 * 60 * 1000
        week: 604800000, // 7 * 24 * 60 * 60 * 1000
        month: 2629800000, // (365.25 / 12) * 24 * 60 * 60 * 1000 (Julian month)
        year: 31557600000, // 365.25 * 24 * 60 * 60 * 1000 (Julian year)
    }

    if (!(unit in units)) {
        throw new Error(`Invalid time unit: ${unit}`);
    }

    return time * units[unit];
}

/**
 * Maps time zone abbreviations to IANA timezone identifiers
 */
export const TIMEZONE_MAP = {
    UTC: "UTC",
    NZT: "Pacific/Auckland",
};

/**
 * TODO
 * @param {*} dateString 
 * @param {*} timeZone 
 * @returns 
 */
export function convertToEpoch(dateString, timeZone) {
    const formattedTimeZone = TIMEZONE_MAP[timeZone] ?? "UTC";
    return DateTime.fromISO(dateString, { zone: formattedTimeZone }).toMillis();
}
