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

// Latest simulation time allowed is 31 December 275759 00:00 (UTC)
// This is since JavaScript's date API can only handle dates up to the year 275760
export const MAX_SIMULATION_TIME = (() => {
    const date = new Date(0);
    date.setUTCFullYear(275759, 11, 31);
    date.setUTCHours(0, 0, 0, 0);
    return date.getTime();
})();

/**
 * Converts milliseconds since epoch to a date in the given time zone.
 *
 * @param {number} epochMs Milliseconds since epoch
 * @param {string} timeZone The time zone (e.g., "UTC", "NZT")
 * @returns {Date} The date in the given time zone
 */
export function millisecondsToZonedLocalDate(epochMs, timeZone) {
    const zone = TIMEZONE_MAP[timeZone] ?? FALLBACK_TIME_ZONE;
    const dt = DateTime.fromMillis(epochMs, { zone });

    const date = new Date();
    // Luxon's months are 1-indexed (1 to 12) but JS months are 0-indexed (0 to 11)
    date.setFullYear(dt.year, dt.month - 1, dt.day);
    date.setHours(dt.hour, dt.minute, dt.second, dt.millisecond);
    return date;
}

/**
 * Converts a date in the given time zone to milliseconds since epoch.
 *
 * @param {Date} date The date to convert
 * @param {string} timeZone The time zone (e.g., "UTC", "NZT")
 * @returns {number} Milliseconds since epoch
 */
export function zonedLocalDateToMilliseconds(date, timeZone) {
    const zone = TIMEZONE_MAP[timeZone] ?? FALLBACK_TIME_ZONE;
    return DateTime.fromObject(
        {
            year: date.getFullYear(),
            // JS months are 0-indexed (0 to 11) but Luxon's are 1-indexed (1 to 12)
            month: date.getMonth() + 1,
            day: date.getDate(),
            hour: date.getHours(),
            minute: date.getMinutes(),
            second: date.getSeconds(),
        },
        { zone },
    ).toMillis();
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
