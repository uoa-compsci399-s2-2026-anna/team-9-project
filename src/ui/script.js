const html = document.documentElement;

// Disable dragging for all links
document.querySelectorAll("a").forEach(a => {
  a.setAttribute("draggable", "false");
})

// DARK/LIGHT MODE

const darkModeToggleButton = document.querySelector("#dark-mode-toggle-button");
const darkModeIcon = document.querySelector("#dark-mode-icon");
const lightModeIcon = document.querySelector("#light-mode-icon");

/**
 * Updates the icon (SVG) of the dark/light mode toggle button to be the
 * correct icon based on the current theme.
 */
function updateDarkModeIcon() {
  const isDark = html.getAttribute("data-theme") === "dark";

  if (isDark) {
    lightModeIcon.classList.remove("hidden");
    darkModeIcon.classList.add("hidden");
  } else {
    lightModeIcon.classList.add("hidden");
    darkModeIcon.classList.remove("hidden");
  }
}

/**
 * Toggles dark/light mode and updates the icon (SVG) of the dark/light
 * mode toggle button.
 */
function toggleDarkMode() {
  const isDark = html.getAttribute("data-theme") === "dark";

  html.setAttribute("data-theme", isDark ? "light" : "dark");
  updateDarkModeIcon();
}

// Check if system theme is dark mode
if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
  html.setAttribute("data-theme", "dark");
} else {
  html.setAttribute("data-theme", "light");
}

// Update icons to ensure they are initially shown correctly depending on
// theme on startup
updateDarkModeIcon();

darkModeToggleButton.addEventListener("click", toggleDarkMode);

// SYSTEMS DROPDOWN

const systemButton = document.getElementById("system-information-button");
const systemDropdown = document.getElementById("system-dropdown");

if (systemButton && systemDropdown) {
  systemButton.addEventListener("click", () => {
    if (systemDropdown.style.display === "none") {
      systemDropdown.style.display = "block";
    } else {
      systemDropdown.style.display= "none";
    }
  });
}

// SETTINGS MENU OVERLAY

const settingsButton = document.querySelector("#settings-button");
const settingsOverlay = document.querySelector("#settings-overlay");
const systemInformationButton = document.querySelector(
  "#system-information-button",
);

/**
 * Toggles the visibility of the settings menu overlay.
 */
function toggleSettingsMenu() {
  settingsOverlay.classList.toggle("opacity-0");
  settingsOverlay.classList.toggle("opacity-100");
  settingsOverlay.classList.toggle("pointer-events-none");
  document.body.classList.toggle("settings-menu-open");
}

settingsButton.addEventListener("click", toggleSettingsMenu);

const closeSettingsMenuButton = document.querySelector(
  "#close-settings-menu-button",
);

closeSettingsMenuButton.addEventListener("click", toggleSettingsMenu);

settingsOverlay.addEventListener("click", (e) => {
  // Close settings menu only when the user clicks outside of the main
  // settings menu panel
  if (e.target === e.currentTarget) {
    toggleSettingsMenu();
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    // Close settings menu if open and user presses escape
    if (document.body.classList.contains("settings-menu-open")) {
      toggleSettingsMenu();
    }
  }
});

// FULLSCREEN BUTTON

const fullscreenButton = document.querySelector("#fullscreen-button");
const enterFullscreenIcon = document.querySelector("#enter-fullscreen-icon");
const exitFullscreenIcon = document.querySelector("#exit-fullscreen-icon");

fullscreenButton.addEventListener("click", () => {
  enterFullscreenIcon.classList.toggle("hidden");
  exitFullscreenIcon.classList.toggle("hidden");

  if (document.fullscreenElement) {
    document.exitFullscreen();
  } else {
    if (html.requestFullscreen) {
      html.requestFullscreen();
    } else if (html.webkitRequestFullscreen) {
      // Safari
      html.webkitRequestFullscreen();
    } else if (html.msRequestFullscreen) {
      // IE11
      html.msRequestFullscreen();
    }
  }
});

// PLAY/PAUSE BUTTON

const playPauseButton = document.querySelector("#play-pause-button");
const playIcon = document.querySelector("#play-icon");
const pauseIcon = document.querySelector("#pause-icon");

playPauseButton.addEventListener("click", () => {
  playIcon.classList.toggle("hidden");
  pauseIcon.classList.toggle("hidden");
});

// VIEW SETTINGS SIDE PANEL

const viewSettingsButton = document.querySelector("#view-settings-button");
const viewSettings = document.querySelector("#view-settings");
const viewSettingsShowIcon = document.querySelector("#view-settings-show-icon");
const viewSettingsHideIcon = document.querySelector("#view-settings-hide-icon");

viewSettingsButton.addEventListener("click", () => {
  viewSettings.classList.toggle("grid-rows-[0fr]");
  viewSettings.classList.toggle("grid-rows-[1fr]");

  viewSettingsShowIcon.classList.toggle("hidden");
  viewSettingsHideIcon.classList.toggle("hidden");
});

// OBJECTS SIDE PANEL

const objectsButton = document.querySelector("#objects-button");
const objects = document.querySelector("#objects");
const objectsShowIcon = document.querySelector("#objects-show-icon");
const objectsHideIcon = document.querySelector("#objects-hide-icon");

objectsButton.addEventListener("click", () => {
  objects.classList.toggle("grid-rows-[0fr]");
  objects.classList.toggle("grid-rows-[1fr]");

  objectsShowIcon.classList.toggle("hidden");
  objectsHideIcon.classList.toggle("hidden");
});
