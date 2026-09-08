import { settings } from "../shared/settingsState.js";
import { bus } from "../events/eventBus.js";
import { EVENTS } from "../events/events.js";
import { currentSimulationTime } from "../rendering/simulationRenderer.js";

const MS_IN_S = 1000;

updateCalendar(getSimulationTimeInMillisecondsSinceUnixEpoch());

bus.subscribe(EVENTS.SETTINGS.TIME_ZONE_SELECT, () => {
    updateCalendar(getSimulationTimeInMillisecondsSinceUnixEpoch());
});

// Show date/time picker when simulation timestamp/calendar button is pressed
bus.subscribe(EVENTS.SIM.SIMULATION_TIMESTAMP_CALENDAR, () => {
    const calendars = document.querySelectorAll(".calendar");

    for (var calendar of calendars) {
        calendar.showPicker();
    }
});

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
 * Updates all calendars to show the given date-time in the given time zone,
 * and sets the minimum and maximum of the calendar to +/- 1 year.
 * @param {Date} date The date object to set the calendar to
 */
function updateCalendar(date) {
    const calendars = document.querySelectorAll(".calendar");

    const DAYS_IN_MS = 24 * 60 * 60 * 1000;

    calendars.forEach((calendar) => {
        calendar.value = formatted(date);
        calendar.min = formatted(new Date(date.getTime() - 365 * DAYS_IN_MS));
        calendar.max = formatted(new Date(date.getTime() + 365 * DAYS_IN_MS));
    });
}

/**
 * @returns OPIS simulation timestamp in milliseconds since Unix epoch.
 */
function getSimulationTimeInMillisecondsSinceUnixEpoch() {
    return new Date(Date.now() + currentSimulationTime * MS_IN_S);
}
