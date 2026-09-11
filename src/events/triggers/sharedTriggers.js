import { bus } from "../eventBus.js";
import { EVENTS } from "../events.js";
import { settings } from "../../shared/settingsState.js";

document.querySelectorAll("[data-button-type]").forEach((buttonType) => {
    const button = buttonType.querySelector("[data-button]");
    const onClickEventName = buttonType.dataset.onClickEventName;

    button.addEventListener("click", () => {
        var eventDetail;

        if (onClickEventName === EVENTS.TOOLBAR.DARK_MODE_TOGGLE) {
            eventDetail = { enterDarkMode: !settings.darkMode }
        }

        bus.publish(onClickEventName, eventDetail);
    });
});
