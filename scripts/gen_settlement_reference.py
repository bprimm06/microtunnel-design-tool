#!/usr/bin/env python3
"""Independent reference implementation for the U9 settlement module tests.

Written directly from the Peck Gaussian-trough method (ASCE 36-15 §13.5) —
NOT ported from the TypeScript. Expected values are hard-coded into
src/engine/settlement/reference-cases.ts.
"""
import math

SQRT2PI = math.sqrt(2.0 * math.pi)
SQRT_E = math.sqrt(math.e)

def trough(x, s_max, i):
    return s_max * math.exp(-(x * x) / (2.0 * i * i))

def slope_at(x, s_max_ft, i):
    return abs(trough(x, s_max_ft, i) * x / (i * i))

def main():
    cutter_od_in, pipe_od_in = 49.5, 48.0
    De, Dp = cutter_od_in / 12.0, pipe_od_in / 12.0
    Aexc = math.pi * De * De / 4.0
    VL = 1.5
    Vs = VL / 100.0 * Aexc
    annulus = (De * De - Dp * Dp) / (De * De) * 100.0
    print(f"Aexc={Aexc:.6f} ft2 Vs={Vs:.6f} ft2/ft annulusVL={annulus:.4f}%")

    segs = [
        (1, 0, 200, 12, 0.5),
        (2, 200, 450, 18, 0.4),
        (3, 450, 600, 10, 0.5),
    ]
    seg_i = {}
    print("segments (idx, z0, i, sMaxIn, maxSlope, slopeDenom):")
    for idx, a, b, cover, K in segs:
        z0 = cover + Dp / 2.0
        i = K * z0
        s_max_ft = Vs / (i * SQRT2PI)
        s_max_in = s_max_ft * 12.0
        sl = s_max_ft / (i * SQRT_E)
        seg_i[idx] = (i, s_max_in)
        print(f"  seg{idx}: z0={z0:.4f} i={i:.4f} sMaxIn={s_max_in:.6f} "
              f"maxSlope={sl:.8f} slopeDenom={1.0/sl:.2f} "
              f"settleRatio={s_max_in/0.5:.4f} slopeRatio={sl/(1.0/500.0):.4f}")

    print("receptors:")
    # House A: sta 500 (seg3), offset 10, limit 0.5
    i, s_max_in = seg_i[3]
    s = trough(10.0, s_max_in, i)
    sl = slope_at(10.0, s_max_in / 12.0, i)
    print(f"  House A: settleIn={s:.6f} slope={sl:.8f} ratio={s/0.5:.4f}")
    # Gas main: sta 100 (seg1), offset 5, default limit 0.5
    i, s_max_in = seg_i[1]
    s = trough(5.0, s_max_in, i)
    sl = slope_at(5.0, s_max_in / 12.0, i)
    print(f"  Gas main: settleIn={s:.6f} slope={sl:.8f} ratio={s/0.5:.4f}")

if __name__ == "__main__":
    main()
