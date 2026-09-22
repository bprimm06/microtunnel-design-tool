#!/usr/bin/env python3
"""Independent reference implementation for the U8 face-pressure module tests.

Written directly from ASCE 36-15 §13.4 — NOT ported from the TypeScript.
Expected values are hard-coded into src/engine/face-pressure/reference-cases.ts.
"""
import math

GAMMA_W = 62.4

def main():
    pipe_od_in, cutter_od_in = 48.0, 49.5
    gamma, k0, ka = 125.0, 0.45, 0.28
    head_area_ft2 = math.pi * (cutter_od_in / 24.0) ** 2

    stations = [
        (0, 8, 2),
        (150, 12, 6),
        (300, 15, 9),
        (450, 20, 14),
        (600, 25, 20),
    ]
    print("FP-01 stations (stationFt, coverFt, gwFt):")
    for sta, cover, gw in stations:
        axis = cover + pipe_od_in / 24.0
        u = GAMMA_W * gw
        s_veff = max(0.0, gamma * axis - u)
        s_vtot = gamma * axis
        p_min = u + ka * s_veff
        p_tgt = u + k0 * s_veff
        p_max = s_vtot  # blowoutFactor 1.0
        f_tgt = p_tgt * head_area_ft2 / 1000.0
        print(f"  sta {sta}: u={u:.4f} sVEff={s_veff:.4f} sVTot={s_vtot:.4f} "
              f"pMin={p_min:.4f} pTgt={p_tgt:.4f} pMax={p_max:.4f} Ftgt={f_tgt:.6f} kips")

if __name__ == "__main__":
    main()
