import { DateTime } from "luxon";
import { settings } from "../shared/settingsState.js";

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
 * Converts a datetime-local string into an epoch timestamp, using the given
 * time zone to interpret it.
 * @param {string} dateString A date/time string in "yyyy-MM-ddTHH:mm" format
 * @param {string} timeZone The application's time zone setting (e.g., "UTC", "NZT")
 * @returns {number} Epoch time in milliseconds
 */
export function convertToEpoch(dateString, timeZone) {
    const formattedTimeZone = TIMEZONE_MAP[timeZone] ?? "UTC";
    return DateTime.fromISO(dateString, { zone: formattedTimeZone }).toMillis();
}


/**
 * @param {Date} date A `Date` object
 * @returns Formatted date/time string in the format taken by
 * `<input type="datetime-local">` (yyyy-MM-dd'T'HH:mm), respecting the time
 * zone setting.
 */
export function formatDate(date, timeZone) {
    var timeZone = TIMEZONE_MAP[timeZone];

    // Use Sweden time format ("sv"), which is in yyyy-MM-dd HH:mm
    return new Intl.DateTimeFormat("sv", {
        timeZone: timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
    })
        .format(date)
        .replace(" ", "T"); // Replace the ' ' with a 'T' to conform to format
}



/**
 * @param {Date} date A `Date` object
 * @returns The date portion (yyyy-MM-dd) of `date`, in the current time zone
 */
export function dateOnly(date, timeZone) {
    var timeZone = TIMEZONE_MAP[timeZone];

    return new Intl.DateTimeFormat("sv", {
        timeZone: timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(date);
}

/**
 * Convert a hex colour number (e.g., 0xe74c3c) into a CSS colour string (e.g., "#e74c3c").
 *
 * @param {number} hex Hex colour
 * @returns {string} CSS colour string
 */
export function hexToCssString(hex) {
    return "#" + hex.toString(16).padStart(6, "0");
}
