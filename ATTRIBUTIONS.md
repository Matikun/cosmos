# Third-Party Data Attributions

## HYG Star Database v4.1

**Source:** https://github.com/astronexus/HYG-Database  
**File used:** `hyg/CURRENT/hygdata_v41.csv`  
**License:** Public Domain (Creative Commons CC0)  
**Author:** David Nash (astronexus)

The HYG database combines data from the Hipparcos catalog (ESA), the Yale Bright Star
Catalog, and the Gliese Catalog of Nearby Stars. The combined catalog is released to
the public domain under CC0.

The raw CSV (`hygdata_v41.csv`) is **not** committed to this repository. The derived
binary pack (`apps/web/public/packs/stars.*.bin`) is committed and is itself public
domain by virtue of its source data. To regenerate the pack, see
`tools/pack-stars/README.md`.

---

## JPL Approximate Planetary Ephemerides

**Source:** E.M. Standish, "Keplerian Elements for Approximate Positions of the Major
Planets", JPL Solar System Dynamics Group  
**URL:** https://ssd.jpl.nasa.gov/planets/approx_pos.html  
**License:** Public domain (NASA/JPL government work)

Table 1 element values (valid 1800 AD–2050 AD) are transcribed verbatim into
`tools/pack-solar/data/solar-system.json` and converted at build time into the
`systems-sol.json` pack. See `tools/pack-solar/README.md`.

---

## Solar System Scope Textures (2k)

**Source:** https://www.solarsystemscope.com/textures/  
**License:** Creative Commons Attribution 4.0 International (CC BY 4.0)  
**Attribution:** Solar System Scope (solarsystemscope.com), NASA-derived imagery

The 2k planet/moon/ring texture images (`.jpg`, `.png`) are **not** committed to this
repository. They are converted to KTX2/ETC1S format and committed as
`apps/web/public/textures/sol/*.ktx2`. The KTX2 files are derived works under the same
CC BY 4.0 license. See `tools/pack-solar/README.md` for conversion instructions.
