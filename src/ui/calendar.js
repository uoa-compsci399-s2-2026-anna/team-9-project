const calendars = document.querySelectorAll(".calendar");

const now = new Date();

const YEARS_IN_MS = 24 * 60 * 60 * 1000;

calendars.forEach((calendar) => {
    calendar.value = formatted(now);
    calendar.min = formatted(new Date(now.getTime() - 365 * YEARS_IN_MS));
    calendar.max = formatted(new Date(now.getTime() + 365 * YEARS_IN_MS));
});

function formatted(date) {
    return date.toISOString().slice(0, 16);
}
