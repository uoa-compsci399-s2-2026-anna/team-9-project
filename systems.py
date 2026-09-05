import rebound
import math

def deg2rad(angle):
    return angle * math.pi / 180.0

def init_solar():
    """
    Initialise solar system function
    Returns simulation and objects
    """
    # Initialise the simulation
    sim = rebound.Simulation()

    sim.units = ("AU", "s", "Msun")

    # Add the sun at current position
    # sim.add("Sun")
    sim.add("solar system")

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
        "Halley's Comet",
    ]

    # Add Halley's comet
    sim.add(
        m=0.0,
        a=17.8,
        e=0.967,
        inc=162.0 * 3.14159 / 180.0,
        omega=58.4 * 3.14159 / 180.0,
        Omega=111.9 * 3.14159 / 180.0,
        M=0.0,
    )

    # Move to COM of the system
    sim.move_to_com()

    return sim, objects


def init_kepler_16():
    # Initialise the simulation
    sim = rebound.Simulation()

    sim.units = ("AU", "s", "Msun")

    # Add and set all objects in the kepler-16 system
    objects = [
        "kepler-16A",
        "kepler-16B",
        "kepler-16b",
    ]

    # Masses of the objects in solar masses
    m_A = 0.6897
    m_B = 0.20255
    m_p = 0.333 * 0.000954588  # (0.333 Mjup)

    # Binary
    a_bin = 0.22431
    e_bin = 0.15944
    i_bin = deg2rad(90.3401)
    Omega_bin = deg2rad(0.0)
    omega_bin = deg2rad(263.464)
    lambda_bin = deg2rad(92.3520)

    # Planet
    a_p = 0.7048
    e_p = 0.0069
    i_p = deg2rad(90.0322)
    Omega_p = deg2rad(0.003)
    omega_p = deg2rad(318.0)
    lambda_p = deg2rad(106.51)

    # Convert mean longitude to mean anomaly:
    M_bin = lambda_bin - Omega_bin - omega_bin
    M_p   = lambda_p   - Omega_p   - omega_p

    sim.add(m=m_A)
    sim.add(m=m_B, a=a_bin, e=e_bin, inc=i_bin, Omega=Omega_bin, omega=omega_bin, M=M_bin)
    sim.add(m=m_p, a=a_p, e=e_p, inc=i_p, Omega=Omega_p, omega=omega_p, M=M_p)

    sim.move_to_com()

    return sim, objects