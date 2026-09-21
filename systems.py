from typing import cast

import rebound
from astropy.time import Time

from utility import get_osculating_orbit, get_position_dict

UNITS = ("AU", "day", "Msun")

# Time when sim.t = 0 for each system
# Updated to stored timestamp in config.json when systems are initialised
sim_initial_jd_tdb: dict[str, float] = {
    "solar system": 0,
    "kepler-16": 0,
    "trappist-1": 0,
}


class SimulationData:
    """
    Class that wraps the simulation data (named tuple)
    """

    sim: rebound.Simulation | None = None
    objects: list[str] | None = None
    reference: dict | None = None

    def __init__(self, sim: rebound.Simulation, objects: list[str], reference: dict):
        self.sim = sim
        self.objects = objects
        self.reference = reference


class Simulations:
    """
    Class that wraps the simulation data dictionary
    """

    __sims: dict[str, SimulationData] = {}

    def __init__(self, all_systems: list[dict]):
        # Get the current JD TDB time so that we can pre-integrate the systems to now
        now_jd_tdb: float = get_current_jd_tdb()

        for system_data in all_systems:
            system_name = system_data["name"].lower()
            self.__sims[system_name] = init_system(system_data, system_name, now_jd_tdb)

    def stop_all(self):
        for sim in self.__sims.values():
            sim.stop()

    def get_sim(self, system_name: str) -> rebound.Simulation | None:
        system_name = system_name.lower()
        if system_name in self.__sims:
            return self.__sims[system_name.lower()].sim
        else:
            return None

    def get_objects(self, system_name: str) -> list[str] | None:
        system_name = system_name.lower()
        if system_name in self.__sims:
            return self.__sims[system_name.lower()].objects
        else:
            return None

    def get_reference(self, system_name: str) -> dict | None:
        system_name = system_name.lower()
        if system_name in self.__sims:
            return self.__sims[system_name.lower()].reference
        else:
            return None

    def reinitialise_sim(
        self, system_data: dict, system_name: str, time_to_integrate_to: float = None
    ):
        """
        Reinitialises a simulation with the (optionally) given JD TDB time to integrate to.
        If no time is given, it integrates to now.
        """

        # If not given, the time_to_integrate_to defaults to now
        if time_to_integrate_to is None:
            time_to_integrate_to = get_current_jd_tdb()

        self.__sims[system_name] = init_system(
            system_data, system_name, time_to_integrate_to
        )

    def quick_integrate(self, t: float, system_data: dict) -> rebound.Simulation:
        """
        Integrates a simulation to the given unix time.
        If it is a shorter time distance it will reinitialised the simulation and
        integrate from there.
        """

        system_name: str = system_data["name"].lower()
        sim: rebound.Simulation | None = self.get_sim(system_name)

        # Get the timestamp in sim time
        sim_time: float = unix_to_sim_time(system_name.lower(), t)

        # Init system if it is none
        if sim is None:
            self.reinitialise_sim(system_data, system_name, sim_time)
            # get_sim cannot return None so we cast
            return cast(rebound.Simulation, self.get_sim(system_name))

        # Calculate the time from the given time to where the sim is
        current_temporal_distance: float = abs(sim_time - sim.t)

        # Calculate the time from the given time to the initial timestamp of the system
        jd_tdb_time: float = unix_to_jd_tdb(t)
        initial_timestamp: float = system_data["timestamp"]
        initial_temporal_distance: float = abs(jd_tdb_time - initial_timestamp)

        if initial_temporal_distance < current_temporal_distance:
            # If the difference is smaller to reinitialise do so
            self.reinitialise_sim(system_data, system_name, jd_tdb_time)
            # get_sim cannot return None so we cast
            return cast(rebound.Simulation, self.get_sim(system_name))
        else:
            # If the difference is greater, integrate normally
            sim.integrate(sim_time)
            return sim


def unix_to_jd_tdb(t: float) -> float:
    """
    Convert a unix timestamp in milliseconds to a JD_TDB timestamp in days
    """
    time_in_s = t / 1000
    return Time(time_in_s, format="unix", scale="utc").tdb.jd


def unix_to_sim_time(system_name: str, t: float) -> float:
    """
    Convert a unix timestamp in milliseconds to a simulation time in days
    """
    return unix_to_jd_tdb(t) - sim_initial_jd_tdb[system_name]


def get_current_jd_tdb() -> float:
    """
    Get the current JD_TDB timestamp in days
    """
    return Time.now().tdb.jd


def init_system(
    system_data: dict, name: str, time_to_integrate_to: float
) -> SimulationData:
    """
    Initialises the given system and integrates it to the given JD TDB time
    Returns SimulationData containing simulation, objects and reference data
    """
    # Initialise the simulation
    sim = rebound.Simulation()
    sim.units = UNITS

    sim_initial_jd_tdb[name] = system_data["timestamp"]

    orbits = system_data["orbits"]

    # Get objects (keys of orbits dictionary) as list
    objects = list(orbits)

    for obj in objects:
        orbit_data = orbits[obj]

        # Get orbit data (and set to None otherwise)
        m = orbit_data.get("m", None)
        # Orbit only info
        a = orbit_data.get("a", None)
        e = orbit_data.get("e", None)
        P = orbit_data.get("P", None)
        omega = orbit_data.get("omega", None)
        M = orbit_data.get("M", None)
        inc = orbit_data.get("inc", None)
        Omega = orbit_data.get("Omega", None)
        # Cartesian only info
        x = orbit_data.get("x", None)
        y = orbit_data.get("y", None)
        z = orbit_data.get("z", None)
        vx = orbit_data.get("vx", None)
        vy = orbit_data.get("vy", None)
        vz = orbit_data.get("vz", None)

        # If orbit only info is given
        if x is None:
            sim.add(m=m, a=a, P=P, e=e, omega=omega, M=M, inc=inc, Omega=Omega)
        # Otherwise use cartesian (cannot use both)
        else:
            sim.add(m=m, x=x, y=y, z=z, vx=vx, vy=vy, vz=vz)

    sim.move_to_com()

    # Gather positions
    positions = {objects[i]: get_position_dict(p) for i, p in enumerate(sim.particles)}

    # Gather orbital data for each object
    orbital_data = {
        objects[i]: get_osculating_orbit(sim, i) for i in range(len(sim.particles))
    }

    reference = {"positions": positions, "orbital_data": orbital_data}

    # Pre-emptively integrate sim to the given time
    sim_time = time_to_integrate_to - system_data["timestamp"]
    sim.integrate(sim_time)

    return SimulationData(sim, objects, reference)
