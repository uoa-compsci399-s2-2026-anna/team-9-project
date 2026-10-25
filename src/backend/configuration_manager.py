import copy
import sys
import os
import json

from platformdirs import user_data_dir


def get_base_path():
    # Resolve base path to the packaged resources folder when frozen,
    # or to the script's own directory otherwise
    if getattr(sys, "frozen", False):
        # Traverses from (e.g.) ./dist/main.exe to ./
        return os.path.dirname(os.path.dirname(sys.executable))
    else:
        # Traverses from (e.g.) ./src/backend/main.py to ./
        return os.path.dirname(os.path.dirname(os.path.dirname(__file__)))


# The version of the systems file (loaded from file)
systems_file_version = None

# The name of the systems file version key
VERSION_KEY = "systems_data_version"

# Path to executable
base_path = get_base_path()

# Name of the application
APPLICATION_NAME = "OPIS"

# Path to OPIS' installed directory
ROAMING_PATH = user_data_dir(APPLICATION_NAME, appauthor=False, roaming=True)

# Filename for the persisted system's reference data
SYSTEMS_REFERENCE_DATA = "systems_reference_data.json"


def get_file_at_path(filename, filepath):
    """
    Opens the file at the given path and gives a nice exception if it does not
    exist or cannot be read
    """

    print(f"Getting file contents from {filepath}")

    try:
        with open(filepath, encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        raise Exception(
            f"{filename} does not exist or cannot be read at {filepath}\n{e}"
        )


def get_systems_data_filemap():
    """
    Get the systems.json file in ./systems
    """

    SYSTEMS_FILENAME = "systems.json"
    SYSTEMS_FILEPATH = os.path.join(base_path, "systems", SYSTEMS_FILENAME)
    systems_list = get_file_at_path(SYSTEMS_FILENAME, SYSTEMS_FILEPATH)

    return systems_list


def systems_data_from_project(systems_list):
    """
    Loads system data that is stored in ./systems
    """

    print("Getting systems data from ./systems")

    SYSTEMS_DIR = os.path.join(base_path, "systems")

    systems = []
    for filename in systems_list["filenames"]:
        filepath = os.path.join(SYSTEMS_DIR, filename)
        if os.path.isfile(filepath):
            current_system = get_file_at_path(filename, filepath)
            systems.append(current_system)

    return {"systems": systems}


def systems_data_from_appdata():
    """
    Loads system data that is updated on launch from appdata cache
    """

    FILENAME = "systems.json"
    FILEPATH = os.path.join(ROAMING_PATH, FILENAME)

    if not os.path.exists(FILEPATH):
        return None

    print(f"Got systems data from {FILEPATH}")

    return get_file_at_path(FILENAME, FILEPATH)


def get_all_systems_data():
    """
    Load the systems data from either the ./systems directory or the systems.json
    cached file per device
    """
    global systems_file_version

    systems_list = get_systems_data_filemap()
    local_version = systems_list[VERSION_KEY]
    systems_file_version = local_version

    # Try get the data from appdata
    systems_data = systems_data_from_appdata()

    # If the file existed
    if systems_data is not None:
        # Get versions from each systems data file
        appdata_version = systems_data.get(VERSION_KEY, "")

        # If they match return the appdata version, otherwise continue
        if appdata_version == local_version:
            return systems_data

        print(
            "Appdata version mismatch! Systems data has been updated since last update."
        )

    # Otherwise load from local ./systems
    systems_data = systems_data_from_project(systems_list)

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
    }

    collated_data[VERSION_KEY] = systems_file_version

    FILENAME = "systems.json"
    FILEPATH = os.path.join(ROAMING_PATH, FILENAME)

    # Force make the path if it does not exist
    os.makedirs(ROAMING_PATH, exist_ok=True)

    try:
        # Write to file
        with open(FILEPATH, "w") as f:
            json.dump(collated_data, f)
    except:
        print(f"Failed to write collated data to {FILEPATH}!", file=sys.stderr)


def get_reference_data_from_appdata():
    """
    Loads the reference data from appdata cache
    """
    FILENAME = SYSTEMS_REFERENCE_DATA
    FILEPATH = os.path.join(ROAMING_PATH, FILENAME)

    if not os.path.exists(FILEPATH):
        return None

    print(f"Got reference data from {FILEPATH}")

    reference_data = get_file_at_path(FILENAME, FILEPATH)

    # If the version does not match return None so it is recreated
    if systems_file_version != reference_data[VERSION_KEY]:
        return None

    return reference_data


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
