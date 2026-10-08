import { DateTime } from "luxon";

// Unit conversions into milliseconds
const unit_to_ms = {
    hour: 3600000, // 60 * 60 * 1000
    day: 86400000, // 24 * 60 * 60 * 1000
    week: 604800000, // 7 * 24 * 60 * 60 * 1000
    month: 2629800000, // (365.25 / 12) * 24 * 60 * 60 * 1000 (Julian month)
    year: 31557600000, // 365.25 * 24 * 60 * 60 * 1000 (Julian year)
};

/**
 * Converts a given amount of time (time + unit) into milliseconds.
 *
 * @param {number} time - The amount of time to convert
 * @param {string} unit The time unit: "hour", "day", "week", "month", or "year"
 * @returns {number} The equivalent amount of time in milliseconds
 */
export function timeToMilliseconds(time, unit) {
    if (!(unit in unit_to_ms)) {
        throw new Error(`Invalid time unit: ${unit}`);
    }

    return time * unit_to_ms[unit];
}

/**
 * Converts a given amount of time in milliseconds into the given time unit.
 *
 * @param {number} ms The amount of time to convert, in milliseconds
 * @param {string} unit The time unit to convert into: "hour", "day", "week", "month", or "year"
 * @returns {number} The equivalent amount of time in the given unit
 */
export function millisecondsToTime(ms, unit) {
    if (!(unit in unit_to_ms)) {
        throw new Error(`Invalid time unit: ${unit}`);
    }

    return ms / unit_to_ms[unit];
}

/**
 * Maps time zone abbreviations to IANA timezone identifiers
 */
export const TIMEZONE_MAP = {
    UTC: "UTC",
    NZT: "Pacific/Auckland",
};

// Earliest simulation time allowed is 1 January of year 1 (UTC)
export const MIN_SIMULATION_TIME = (() => {
    const date = new Date(0);
    date.setUTCFullYear(1, 0, 1);
    date.setUTCHours(0, 0, 0, 0);
    return date.getTime();
})();

/**
 * Converts a datetime string into an epoch timestamp, using the given
 * time zone to interpret it.
 * @param {string} dateString A date/time string in "dd-MM-yyyy hh:mm a" format
 * @param {string} timeZone The application's time zone setting (e.g., "UTC", "NZT")
 * @returns {number} Epoch time in milliseconds
 */
export function convertToEpoch(dateString, timeZone) {
    const formattedTimeZone = TIMEZONE_MAP[timeZone] ?? "UTC";
    return DateTime.fromFormat(dateString, "dd-MM-yyyy hh:mm a", {
        zone: formattedTimeZone,
    }).toMillis();
}

/**
 * Formats an epoch timestamp as a string in the given time zone;
 * the inverse of `convertToEpoch`.
 * @param {number} epochMs Epoch time in milliseconds
 * @param {string} timeZone The application's time zone setting (e.g., "UTC", "NZT")
 * @returns {string} The formatted date string as "dd-MM-yyyy hh:mm a"
 */
export function formatInTimeZone(epochMs, timeZone) {
    const formattedTimeZone = TIMEZONE_MAP[timeZone] ?? "UTC";
    return DateTime.fromMillis(epochMs, { zone: formattedTimeZone }).toFormat(
        "dd-MM-yyyy hh:mm a",
    );
}

/**
 * @param {Date} date A `Date` object
 * @param {string} timeZone The calendar's time zone setting (e.g., "UTC", "NZT")
 * @returns Formatted date/time string in the format taken by
 * `<input type="datetime-local">` (yyyy-MM-dd'T'HH:mm), respecting the time
 * zone setting.
 */
export function formatDate(date, timeZone) {
    var timeZone = TIMEZONE_MAP[timeZone] ?? "UTC";

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
 * @param {string} timeZone The calendar's time zone setting (e.g., "UTC", "NZT")
 * @returns The date portion (yyyy-MM-dd) of `date`, in the given time zone
 */
export function dateOnly(date, timeZone) {
    var timeZone = TIMEZONE_MAP[timeZone] ?? "UTC";

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
