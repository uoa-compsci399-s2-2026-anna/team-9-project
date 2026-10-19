import copy
import sys
import os
import json

# The version of this manager so that the data can be invalidated on update
SYSTEMS_MANAGER_VERSION = "1.0"

# Resolve base path to the packaged resources folder when frozen,
# or to the script's own directory otherwise
if getattr(sys, "frozen", False):
    base_path = os.path.dirname(os.path.dirname(sys.executable))
else:
    base_path = os.path.dirname(os.path.abspath(__file__))


def get_file_at_path(filename, filepath):
    """
    Opens the file at the given path and gives a nice exception if it does not
    exist or cannot be read
    """

    with open(filepath, encoding="utf-8") as f:
        return json.load(f)

    raise Exception(f"{filename} does not exist or cannot be read at {filepath}")


def systems_data_from_project():
    """
    Loads system data that is stored in /systems
    """

    SYSTEMS_DIR = os.path.join(base_path, "systems")

    SYSTEMS_FILENAME = "systems.json"
    SYSTEMS_FILEPATH = os.path.join(SYSTEMS_DIR, SYSTEMS_FILENAME)
    systems_list = get_file_at_path(SYSTEMS_FILENAME, SYSTEMS_FILEPATH)

    systems = []
    for filename in systems_list["filenames"]:
        filepath = os.path.join(SYSTEMS_DIR, filename)
        if os.path.isfile(filepath) and filename.endswith(".json"):
            current_system = get_file_at_path(filename, filepath)
            systems.append(current_system)

    return {"systems": systems}


def systems_data_from_appdata():
    """
    Loads system data that is updated on launch from appdata cache
    """

    roaming_path = os.getenv("APPDATA")
    FILENAME = "systems.json"
    FILEPATH = os.path.join(roaming_path, "OPIS", FILENAME)

    if not os.path.exists(FILEPATH):
        return None


    return get_file_at_path(FILENAME, FILEPATH)


def get_all_systems_data():
    """
    Load the systems data from either the /systems directory or the systems.json
    cached file per device
    """

    # Try get the data from appdata
    systems_data = systems_data_from_appdata()

    # If the file did not exist OR the file has an outdated version get it from
    # the /systems directory
    if systems_data is None or systems_data["systems data version"] != SYSTEMS_MANAGER_VERSION:
        systems_data = systems_data_from_project()

    return systems_data


def export_all_systems_data_to_file(orbit_data, all_systems):
    """
    Takes the updated orbital data, overwrites the other data and writes it out
    """
    
    # Deepcopy so that we do not edit the original object
    new_systems_data = copy.deepcopy(all_systems)

    for system_data in all_systems:
        system_name = system_data["name"].lower()
        current_system = next(
            data for data in new_systems_data if data["name"].lower() == system_name
        )

        # Set the orbits and timestamp to the new versions
        current_system["orbits"] = orbit_data[system_name]["orbits"]
        current_system["timestamp"] = orbit_data[system_name]["timestamp"]

    # Add the version to object
    collated_data = {
        "systems": new_systems_data,
        "systems data version": SYSTEMS_MANAGER_VERSION,
    }

    # Write to file
    roaming_path = os.getenv("APPDATA")
    FILENAME = "systems.json"
    FILEPATH = os.path.join(roaming_path, "OPIS", FILENAME)

    with open(FILEPATH, "w") as f:
        json.dump(collated_data, f)


def get_settings_schema():
    """
    Load the settings schema
    """
    FILENAME = "settingsSchema.json"
    FILEPATH = os.path.join(base_path, "src", "shared", FILENAME)
    return get_file_at_path(FILENAME, FILEPATH)


def get_simulation_state_schema():
    """
    Load the sim state schema
    """
    FILENAME = "simulationStateSchema.json"
    FILEPATH = os.path.join(base_path, "src", "shared", FILENAME)
    return get_file_at_path(FILENAME, FILEPATH)


def get_shortcuts():
    """
    Load the keyboard shortcuts
    """
    FILENAME = "shortcuts.json"
    FILEPATH = os.path.join(base_path, "src", "shared", FILENAME)
    return get_file_at_path(FILENAME, FILEPATH)
