import { settings } from "../shared/settingsState.js";
import { bus } from "../events/eventBus.js";
import { EVENTS } from "../events/events.js";

updateCalendar();

/**
 * @param {Date} date A `Date` object
 * @returns Formatted date/time string in the format taken by
 * `<input type="datetime-local">` (yyyy-MM-dd'T'HH:mm), respecting the time
 * zone setting.
 */
function formatted(date) {
    var timeZone;

    switch (settings.timeZone) {
        case "NZT":
            timeZone = "Pacific/Auckland";
            break;
        case "UTC":
        default:
            timeZone = "UTC";
            break;
    }

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
 * Updates all calendars to show the current date time in the given time zone,
 * and sets the minimum and maximum of the calendar to +/- 1 year.
 */
function updateCalendar() {
    const now = new Date();

    const calendars = document.querySelectorAll(".calendar");

    const YEARS_IN_MS = 24 * 60 * 60 * 1000;

    calendars.forEach((calendar) => {
        calendar.value = formatted(now);
        calendar.min = formatted(new Date(now.getTime() - 365 * YEARS_IN_MS));
        calendar.max = formatted(new Date(now.getTime() + 365 * YEARS_IN_MS));
    });
}
