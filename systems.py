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
    """
    Initialise Kepler-16 function
    Returns rebound simulation object and objects

    Data is taken from Doyle et al. 2011, "Kepler-16: A Transiting Circumbinary Planet", Science, 333, 1602
    https://arxiv.org/abs/1109.3432
    """
    # Initialise the simulation
    sim = rebound.Simulation()

    sim.units = ("AU", "s", "Msun")

    # Add and set all objects in the kepler-16 system
    objects = [
        "kepler-16A",
        "kepler-16B",
        "kepler-16b",
    ]

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

    # Add 16A (First star)
    sim.add(m=0.6897)
    # Add 16B (Second star)
    sim.add(m=0.20255, a=a_bin, e=e_bin, inc=i_bin, Omega=Omega_bin, omega=omega_bin, M=M_bin)
    # Add 16b (Planet)
    sim.add(m=0.0003178778, a=a_p, e=e_p, inc=i_p, Omega=Omega_p, omega=omega_p, M=M_p)

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

    sim.units = ("AU", "s", "Msun")

    # Add and set all objects in the trappist-1 system
    objects = [
        "Trappist-1",
        "Trappist-1b",
        "Trappist-1c",
        "Trappist-1d",
        "Trappist-1e",
        "Trappist-1f",
        "Trappist-1g",
        "Trappist-1h",
    ]

    # Trappist-1 
    sim.add(m=0.0898)

    # All inclination and Omega are identical
    inc = 1.5707963267948966
    Omega = 0

    # Trappist-1b
    sim.add(m=1.2366358000000002e-06, P=130535.3664, e=0.0030547340309755285, omega=2.3515648936386335, M=1.58330904089647, inc=inc, Omega=Omega)

    # Trappist-1c
    sim.add(m=1.176829e-06, P=209255.35679999998, e=0.0005500909015790027, omega=0.01817981507297828, M=4.581013289959033, inc=inc, Omega=Omega)

    # Trappist-1d
    sim.add(m=3.48873e-07, P=349852.5216, e=0.005632983223834418, omega=2.64777152033153, M=1.3398571437885913, inc=inc, Omega=Omega)

    # Trappist-1e
    sim.add(m=6.224936e-07, P=527127.5232, e=0.006324634376784163, omega=-0.8167078389843289, M=0.10653405834521407, inc=inc, Omega=Omega)

    # Trappist-1f
    sim.add(m=9.349078000000002e-07, P=795531.456, e=0.00841546790143008, omega=-3.080952805470817, M=0.5847415970602159, inc=inc, Omega=Omega)

    # Trappist-1g
    sim.add(m=1.1887724e-06, P=1067251.3344, e=0.004009788024322483, omega=0.32490511806511907, M=0.1101426471560622, inc=inc, Omega=Omega)

    # Trappist-1h
    sim.add(m=2.9283780000000003e-07, P=1621975.6224, e=0.003650054794109261, omega=-3.136113256373088, M=2.786133876732481, inc=inc, Omega=Omega)

    sim.move_to_com()
    
    return sim, objects