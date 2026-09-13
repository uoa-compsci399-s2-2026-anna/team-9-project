import { settings } from "../shared/settingsState.js";
import { bus } from "../events/eventBus.js";
import { EVENTS } from "../events/events.js";
import { TIMEZONE_MAP, timeToMilliseconds } from "../utils/utils.js";

// The number of milliseconds in a day
const MS_PER_DAY = timeToMilliseconds(1, "day");

// The last simulation time (in ms since the Unix epoch) displayed by the calendar
let lastSimulationTime = null;

// The last calendar date displayed (in yyyy-MM-dd'T'HH:mm format)
export let lastCalendarDate = null;

bus.subscribe(EVENTS.SETTINGS.TIME_ZONE_SELECT, () => {
    // Refresh the calendar with the last simulation time to reflect the new time zone
    updateCalendar(lastSimulationTime);
});

/**
 * @param {Date} date A `Date` object
 * @returns Formatted date/time string in the format taken by
 * `<input type="datetime-local">` (yyyy-MM-dd'T'HH:mm), respecting the time
 * zone setting.
 */
function formatted(date) {
    var timeZone = TIMEZONE_MAP[settings.timeZone];

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
function dateOnly(date) {
    var timeZone = TIMEZONE_MAP[settings.timeZone];

    return new Intl.DateTimeFormat("sv", {
        timeZone: timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(date);
}

/**
 * Gets the elapsed days text which describes how far the simulation time is from today,
 * in the current time zone (e.g., "Today", "3 days from today", "5 days ago").
 * @param {*} simulationTime Simulation time as milliseconds since the Unix epoch
 * @returns The elapsed days text
 */
export function getElapsedDaysText(simulationTime) {
    const simDateString = dateOnly(new Date(simulationTime));
    const nowDateString = dateOnly(new Date());

    if (simDateString === nowDateString) {
        return "Today";
    }

    const simMidnight = new Date(simDateString + "T00:00:00Z").getTime();
    const nowMidnight = new Date(nowDateString + "T00:00:00Z").getTime();

    const daysCount = Math.round((simMidnight - nowMidnight) / MS_PER_DAY);
    const dayWord = Math.abs(daysCount) === 1 ? "day" : "days";

    if (daysCount > 0) {
        return `${daysCount} ${dayWord} from today`;
    } else {
        return `${Math.abs(daysCount)} ${dayWord} ago`;
    }
}

/**
 * Updates the elapsed days text to show how far the simulation time is from today,
 * in the current time zone (e.g., "Today", "3 days from today", "5 days ago").
 * @param {number} simulationTime Simulation time as milliseconds since the Unix epoch
 */
function updateElapsedDaysText(simulationTime) {
    const elapsedDays = document.querySelector("#elapsed-days");

    if (!elapsedDays) {
        return;
    }

    const elapsedDaysText = getElapsedDaysText(simulationTime);
    console.log(elapsedDaysText);
    elapsedDays.textContent = elapsedDaysText;
}

/**
 * Updates all calendars to show the given simulation time in the given time zone,
 * and sets the minimum and maximum of the calendar to +/- 3 years.
 * @param {number} simulationTime Simulation time as milliseconds since the Unix epoch
 */
export function updateCalendar(simulationTime) {
    lastSimulationTime = simulationTime;

    const date = new Date(simulationTime);

    const calendars = document.querySelectorAll(".calendar");

    const CALENDAR_RANGE_YEARS = 3;
    const CALENDAR_RANGE_MS = timeToMilliseconds(CALENDAR_RANGE_YEARS, "year");

    calendars.forEach((calendar) => {
        calendar.value = formatted(date);
        calendar.min = formatted(new Date(date.getTime() - CALENDAR_RANGE_MS));
        calendar.max = formatted(new Date(date.getTime() + CALENDAR_RANGE_MS));

        lastCalendarDate = calendar.value;
    });

    updateElapsedDaysText(simulationTime);
}
