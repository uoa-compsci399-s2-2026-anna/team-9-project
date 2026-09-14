import rebound
from astropy.time import Time
from utility import *

UNITS = ("AU", "day", "Msun")

# From Doyle et al. 2011, "Kepler-16: A Transiting Circumbinary Planet"
# https://arxiv.org/abs/1109.3432
KEPLER_16_INITIAL_BJD_TDB = 2_455_212.12316

# From Agol et al. 2021, "Refined masses and densities of the TRAPPIST-1 planets"
# https://arxiv.org/abs/2010.01074
TRAPPIST_1_INITIAL_BJD_TDB = 2_457_257.93115525


# Time when sim.t = 0 for each system
# Note: Kepler-16 and TRAPPIST-1 use BJD_TDB, while the Solar System uses JD_TDB,
# so there is a small difference in the time representation.
sim_initial_jd_tdb: dict[str, float] = {
    "solar system": None, # Will be set to the current time when initialised
    "kepler-16": KEPLER_16_INITIAL_BJD_TDB,
    "trappist-1": TRAPPIST_1_INITIAL_BJD_TDB,
}


class SimulationState:
    """
    Class that wraps the simulation state dictionary
    """
    __sims: dict[str, tuple[rebound.Simulation, list[str], dict]] = {}

    def __init__(self, all_systems: list[dict]):
        for system_data in all_systems:
            system_name = system_data["name"].lower()
            self.__sims[system_name] = init_system(system_data, system_name)

    def get_all(self) -> dict[str, tuple[rebound.Simulation, list[str], dict]]:
        return self.__sims

    def get(self, system_name) -> tuple[rebound.Simulation | None, list[str] | None, dict | None]:
        return self.__sims.get(system_name.lower(), (None, None, None))

    def get_sim(self, system_name: str) -> rebound.Simulation | None:
        system_name = system_name.lower()
        if system_name in self.__sims:
            return self.__sims[system_name.lower()][0]
        else:
            return None

    def get_objects(self, system_name: str) -> list[str] | None:
        system_name = system_name.lower()
        if system_name in self.__sims:
            return self.__sims[system_name.lower()][1]
        else:
            return None

    def get_reference(self, system_name: str) -> dict | None:
        system_name = system_name.lower()
        if system_name in self.__sims:
            return self.__sims[system_name.lower()][2]
        else:
            return None

    def set_sim(self, system_name: str, sim: rebound.Simulation, objects: list[str], reference: dict):
        self.__sims[system_name] = (sim, objects, reference)



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


def init_system(system_data: dict, name: str) -> tuple[rebound.Simulation, list[str], dict]:
    """
    Initialises the given system
    Returns simulation and objects
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

    # Integrate to reference time (t=0)
    sim.integrate(0)

    # Gather positions
    positions = {objects[i]: get_position_dict(p) for i, p in enumerate(sim.particles)}

    # Gather orbital data for each object
    orbital_data = {
        objects[i]: get_osculating_orbit(sim, i) for i in range(len(sim.particles))
    }

    reference = {"positions": positions, "orbital_data": orbital_data}

    return sim, objects, reference
