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

    objects = list(system["orbits"])
    orbits = system["orbits"]

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


def init_solar(system):
    """
    Initialise solar system function
    Returns simulation and objects
    """
    # Initialise the simulation
    sim = rebound.Simulation()
    sim.units = UNITS

    sim_initial_jd_tdb["solar system"] = system["timestamp"]

    # Add and set all objects in the solar system
    objects = [
        "Sun",
        "Mercury",
        "Venus",
        "Earth",
        "Mars",
        "Jupiter",
        "Saturn",
        "Uranus",
        "Neptune",
        "DES=1P",
    ]

    for obj in objects:
        sim.add(obj)

    # Move to COM of the system
    sim.move_to_com()

    return sim, objects


def init_kepler_16():
    """
    Initialise Kepler-16 function
    Returns rebound simulation object and objects

    Data is taken from Doyle et al. 2011, "Kepler-16: A Transiting Circumbinary Planet", Science, 333, 1602
    https://arxiv.org/abs/1109.3432
    """
    # Initialise the simulation
    sim = rebound.Simulation()
    sim.units = UNITS

    # Add and set all objects in the kepler-16 system
    objects = [
        "Kepler-16A",
        "Kepler-16B",
        "Kepler-16b",
    ]

    # Add 16A (First star)
    sim.add(m=0.6897)
    # Add 16B (Second star)
    sim.add(
        m=0.20255,
        a=0.22431,
        e=0.15944,
        inc=1.5767321916,
        Omega=0.0,
        omega=4.5983142605,
        M=-2.9864677897,
    )
    # Add 16b (Planet)
    sim.add(
        m=0.0003178778,
        a=0.7048,
        e=0.0069,
        inc=1.5713583228,
        Omega=0.0000523599,
        omega=5.5501470213,
        M=-3.6912491949,
    )

    sim.move_to_com()

    return sim, objects


def init_trappist_1():
    """
    Initialise trappist-1 system function
    Returns rebound simulation object and objects

    Data is calculated from data given in Agol et al. 2021, "Refined masses and densities of the TRAPPIST-1 planets", The Astrophysical Journal, 922:107
    https://arxiv.org/abs/2010.01074
    """
    # Initialise the simulation
    sim = rebound.Simulation()
    sim.units = UNITS

    # Add and set all objects in the trappist-1 system
    objects = [
        "TRAPPIST-1",
        "TRAPPIST-1b",
        "TRAPPIST-1c",
        "TRAPPIST-1d",
        "TRAPPIST-1e",
        "TRAPPIST-1f",
        "TRAPPIST-1g",
        "TRAPPIST-1h",
    ]

    # TRAPPIST-1
    sim.add(m=0.0898)

    # All inclination and Omega are identical
    inc = 1.5707963267948966
    Omega = 0

    # TRAPPIST-1b
    sim.add(
        m=4.13610554870027e-06,
        P=1.510826,
        e=0.0030547340309755285,
        omega=2.3515648936386335,
        M=0.806833482602799, # TODO: verify all M values for TRAPPIST-1 planets
        inc=inc,
        Omega=Omega,
    )
    # TRAPPIST-1c
    sim.add(
        m=3.93607314034689e-06,
        P=2.421937,
        e=0.0005500909015790027,
        omega=0.01817981507297828,
        M=6.132529809985432,
        inc=inc,
        Omega=Omega,
    )
    # TRAPPIST-1d
    sim.add(
        m=1.16685571539471e-06,
        P=4.049219,
        e=0.005632983223834418,
        omega=2.64777152033153,
        M=0.272782080175814,
        inc=inc,
        Omega=Omega,
    )
    # TRAPPIST-1e
    sim.add(
        m=2.08201900105949e-06,
        P=6.101013,
        e=0.006324634376784163,
        omega=-0.8167078389843289,
        M=2.485348216981597,
        inc=inc,
        Omega=Omega,
    )
    # TRAPPIST-1f
    sim.add(
        m=3.12693303808863e-06,
        P=9.207540,
        e=0.00841546790143008,
        omega=-3.080952805470817,
        M=5.253296959827790,
        inc=inc,
        Omega=Omega,
    )
    # TRAPPIST-1g
    sim.add(
        m=3.97601955222527e-06,
        P=12.352446,
        e=0.004009788024322483,
        omega=0.32490511806511907,
        M=1.348441163931109,
        inc=inc,
        Omega=Omega,
    )
    # TRAPPIST-1h
    sim.add(
        m=9.79437963423977e-07,
        P=18.772866,
        e=0.003650054794109261,
        omega=-3.136113256373088,
        M=1.217158246012907,
        inc=inc,
        Omega=Omega,
    )

    sim.move_to_com()

    return sim, objects
