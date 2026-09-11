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


def init_system(system):
    """
    Initialise general system in config function
    Returns rebound simulation object and objects

    """
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