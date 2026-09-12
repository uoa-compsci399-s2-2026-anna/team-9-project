import { settings } from "../shared/settingsState.js";
import { bus } from "../events/eventBus.js";
import { EVENTS } from "../events/events.js";
import { TIMEZONE_MAP, timeToMilliseconds } from "../utils/utils.js";

// The last simulation time displayed by the calendar
let lastSimulationTime = null;

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

        // Update the previousValue field 
        calendar.dataset.previousValue = calendar.value;
    });
}
