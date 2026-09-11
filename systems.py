import rebound


def init_solar(system):
    """
    Initialise solar system function
    Returns simulation and objects
    """
    # Initialise the simulation
    sim = rebound.Simulation()

    sim.units = ("AU", "s", "Msun")

    # Add all solar system objects
    sim.add("solar system")

    # Add and set all objects in the solar system
    objects = list(system["objects"])

    # Add Halley's comet
    sim.add(
        m=0.0,
        a=17.8,
        e=0.967,
        inc=2.8274333882,
        omega=1.0192722832,
        Omega=1.9530234330,
        M=0.0,
    )

    # Move to COM of the system
    sim.move_to_com()

    return sim, objects


def init_kepler_16(system):
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
    objects = list(system["objects"])

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


def init_system(system):
    # Initialise the simulation
    sim = rebound.Simulation()

    sim.units = ("AU", "s", "Msun")

    # Add and set all objects in the trappist-1 system
    objects = list(system["orbits"])
    orbits = system["orbits"]

    for obj in objects:
        orbit_data = orbits[obj]

        # Get orbit data (and set to None otherwise)
        m = orbit_data.get("m", None)
        a = orbit_data.get("a", None)
        P = orbit_data.get("P", None)
        e = orbit_data.get("e", None)
        omega = orbit_data.get("omega", None)
        M = orbit_data.get("M", None)
        inc = orbit_data.get("inc", None)
        Omega = orbit_data.get("Omega", None)

        sim.add(m=m, a=a, P=P, e=e, omega=omega, M=M, inc=inc, Omega=Omega)

    sim.move_to_com()
    return sim, objects


def init_trappist_1(system):
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
    objects = list(system["objects"])

    # Trappist-1
    sim.add(m=0.0898)

    # All inclination and Omega are identical
    inc = 1.5707963267948966
    Omega = 0

    # Trappist-1b
    sim.add(
        m=1.2366358000000002e-06,
        P=130535.3664,
        e=0.0030547340309755285,
        omega=2.3515648936386335,
        M=1.58330904089647,
        inc=1.5707963267948966,
        Omega=0,
    )
    # Trappist-1c
    sim.add(
        m=1.176829e-06,
        P=209255.35679999998,
        e=0.0005500909015790027,
        omega=0.01817981507297828,
        M=4.581013289959033,
        inc=1.5707963267948966,
        Omega=0,
    )
    # Trappist-1d
    sim.add(
        m=3.48873e-07,
        P=349852.5216,
        e=0.005632983223834418,
        omega=2.64777152033153,
        M=1.3398571437885913,
        inc=1.5707963267948966,
        Omega=0,
    )
    # Trappist-1e
    sim.add(
        m=6.224936e-07,
        P=527127.5232,
        e=0.006324634376784163,
        omega=-0.8167078389843289,
        M=0.10653405834521407,
        inc=1.5707963267948966,
        Omega=0,
    )
    # Trappist-1f
    sim.add(
        m=9.349078000000002e-07,
        P=795531.456,
        e=0.00841546790143008,
        omega=-3.080952805470817,
        M=0.5847415970602159,
        inc=1.5707963267948966,
        Omega=0,
    )
    # Trappist-1g
    sim.add(
        m=1.1887724e-06,
        P=1067251.3344,
        e=0.004009788024322483,
        omega=0.32490511806511907,
        M=0.1101426471560622,
        inc=1.5707963267948966,
        Omega=0,
    )
    # Trappist-1h
    sim.add(
        m=2.9283780000000003e-07,
        P=1621975.6224,
        e=0.003650054794109261,
        omega=-3.136113256373088,
        M=2.786133876732481,
        inc=1.5707963267948966,
        Omega=0,
    )

    sim.move_to_com()

    return sim, objects
