class OrbitalElements {
    /**
     *
     * @param {Number} semiMajorAxis a.k.a. `a`
     * @param {Number} eccentricity a.k.a. `e`
     * @param {Number} inclination a.k.a. `inc`
     * @param {Number} ascendingNodeLongitude a.k.a. `Omega`
     * @param {Number} periapsisArgument a.k.a. `omega`
     */
    constructor(
        semiMajorAxis,
        eccentricity,
        inclination,
        ascendingNodeLongitude,
        periapsisArgument,
    ) {
        this.semiMajorAxis = semiMajorAxis;
        this.eccentricity = eccentricity;
        this.inclination = inclination;
        this.ascendingNodeLongitude = ascendingNodeLongitude;
        this.periapsisArgument = periapsisArgument;
    }
}
