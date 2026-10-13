import { DateTime } from "luxon";

// Unit conversions into milliseconds
const UNIT_TO_MS = {
    millisecond: 1,
    second: 1000,
    minute: 60000, // 60 * 1000
    hour: 3600000, // 60 * 60 * 1000
    day: 86400000, // 24 * 60 * 60 * 1000
    week: 604800000, // 7 * 24 * 60 * 60 * 1000
    month: 2629800000, // (365.25 / 12) * 24 * 60 * 60 * 1000 (Julian month)
    year: 31557600000, // 365.25 * 24 * 60 * 60 * 1000 (Julian year)
};

function assertValidUnit(unit) {
    if (!(unit in UNIT_TO_MS)) {
        throw new Error(`Invalid time unit: ${unit}`);
    }
}

/**
 * @typedef {"millisecond"|"second"|"minute"|"hour"|"day"|"week"|"month"|"year"} TimeUnit
 */

/**
 * Converts a given amount of time (time + unit) into milliseconds.
 *
 * @param {number} time - The amount of time to convert
 * @param {TimeUnit} unit The time unit to convert from
 * @returns {number} The equivalent amount of time in milliseconds
 * @throws {Error} If `unit` is not a valid time unit
 */
export function timeToMilliseconds(time, unit) {
    assertValidUnit(unit);

    return time * UNIT_TO_MS[unit];
}

/**
 * Converts a given amount of time in milliseconds into the given time unit.
 *
 * @param {number} ms The amount of time to convert, in milliseconds
 * @param {TimeUnit} unit The time unit to convert into
 * @returns {number} The equivalent amount of time in the given unit
 * @throws {Error} If `unit` is not a valid time unit
 */
export function millisecondsToTime(ms, unit) {
    assertValidUnit(unit);

    return ms / UNIT_TO_MS[unit];
}

/**
 * Converts an amount of time from one unit to another.
 *
 * @param {number} time The amount of time to convert, in `fromUnit`
 * @param {TimeUnit} fromUnit The unit that `time` is currently in
 * @param {TimeUnit} toUnit The unit to convert into
 * @returns {number} The equivalent amount of time in `toUnit`
 * @throws {Error} If `fromUnit` or `toUnit` is not a valid time unit
 */
export function convertTime(time, fromUnit, toUnit) {
    const timeInMs = timeToMilliseconds(time, fromUnit);
    const timeInNewUnit = millisecondsToTime(timeInMs, toUnit);

    return timeInNewUnit;
}

/**
 * Maps time zone abbreviations to IANA timezone identifiers
 */
export const TIMEZONE_MAP = {
    UTC: "UTC",
    NZT: "Pacific/Auckland",
};

// Fallback time zone
export const FALLBACK_TIME_ZONE = "UTC";

// Earliest simulation time allowed is 1 January of year 1 (UTC)
export const MIN_SIMULATION_TIME = (() => {
    const date = new Date(0);
    date.setUTCFullYear(1, 0, 1);
    date.setUTCHours(0, 0, 0, 0);
    return date.getTime();
})();

// Latest simulation time allowed is 31 December 9999 00:00 (UTC)
export const MAX_SIMULATION_TIME = (() => {
    const date = new Date(0);
    date.setUTCFullYear(9999, 11, 31);
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
    const formattedTimeZone = TIMEZONE_MAP[timeZone] ?? FALLBACK_TIME_ZONE;
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
    const formattedTimeZone = TIMEZONE_MAP[timeZone] ?? FALLBACK_TIME_ZONE;
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
    const formattedTimeZone = TIMEZONE_MAP[timeZone] ?? FALLBACK_TIME_ZONE;

    // Use Sweden time format ("sv"), which is in yyyy-MM-dd HH:mm
    return new Intl.DateTimeFormat("sv", {
        timeZone: formattedTimeZone,
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
    const formattedTimeZone = TIMEZONE_MAP[timeZone] ?? FALLBACK_TIME_ZONE;

    return new Intl.DateTimeFormat("sv", {
        timeZone: formattedTimeZone,
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
