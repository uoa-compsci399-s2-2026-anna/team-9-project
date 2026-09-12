import rebound
from astropy.time import Time

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
sim_initial_jd_tdb = {
    "solar system": None, # Will be set to the current time when initialised
    "kepler-16": KEPLER_16_INITIAL_BJD_TDB,
    "trappist-1": TRAPPIST_1_INITIAL_BJD_TDB,
}


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


def init_system(system, name):
    """
    Initialises the given system
    Returns simulation and objects
    """
    # Initialise the simulation
    sim = rebound.Simulation()
    sim.units = UNITS

    sim_initial_jd_tdb[name] = system["timestamp"]

    orbits = system["orbits"]

    # Get objects (keys of orbits dictionary) as list
    objects = list(orbits)

    for obj in objects:
        orbit_data = orbits[obj]

        # Get orbit data (and set to None otherwise)
        m = orbit_data.get("m", None)
        a = orbit_data.get("a", None)
        e = orbit_data.get("e", None)
        P = orbit_data.get("P", None)
        omega = orbit_data.get("omega", None)
        M = orbit_data.get("M", None)
        inc = orbit_data.get("inc", None)
        Omega = orbit_data.get("Omega", None)

        sim.add(m=m, a=a, P=P, e=e, omega=omega, M=M, inc=inc, Omega=Omega)

    sim.move_to_com()

    return sim, objects
