import sys
import os
import json

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


def get_all_systems_data():
    """
    Load the systems data from the config file
    """
    FILENAME = "config.json"
    FILEPATH = os.path.join(base_path, FILENAME)
    return get_file_at_path(FILENAME, FILEPATH)


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
