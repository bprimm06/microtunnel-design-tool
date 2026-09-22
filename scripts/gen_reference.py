#!/usr/bin/env python3
"""Independent reference implementation for the U7 jacking engine tests.

Written directly from ASCE 36-15 §13.4 / §13.3 / §16.5 and the U7 spec —
NOT ported from the TypeScript. Expected values below are hard-coded into
src/engine/jacking/reference-cases.ts. Countersign with a hand calc before
closing U7.
"""
import math

GAMMA_W = 62.4  # pcf

def face_component_kips(cutter_od_in, K, sigma_v_eff_psf, u_psf):
    area_ft2 = math.pi * (cutter_od_in / 24.0) ** 2
    return (K * sigma_v_eff_psf + u_psf) * area_ft2 / 1000.0

def arching_sigma_n_psf(D_ft, gamma_eff_pcf, c_psf, K, phi_deg, H_ft):
    tan_phi = math.tan(math.radians(phi_deg))
    denom = 2.0 * K * tan_phi
    a = D_ft * (gamma_eff_pcf - 2.0 * c_psf / D_ft) / denom
    return a * (1.0 - math.exp(-denom * H_ft / D_ft))

def main():
    pipe_od_in, cutter_od_in = 48.0, 49.5
    D_ft = pipe_od_in / 12.0
    restart = (1.0, 1.15, 1.3)

    segs = [
        # tabulated
        dict(start=0, end=200, cover=15, gw=6, gamma=125, k0=0.45,
             mode="tabulated", f=(150, 250, 400), curve=1.0),
        # arching: phi'=30, c=0, lube 0.8
        dict(start=200, end=450, cover=18, gw=9, gamma=128, k0=0.45,
             mode="arching", phi=30.0, c=0.0, lube=0.8, curve=1.0),
        # buoyant: W=420 plf, mu'=0.35, curve 1.15
        dict(start=450, end=600, cover=20, gw=10, gamma=130, k0=0.5,
             mode="buoyant", W=420.0, mu=0.35, curve=1.15),
    ]

    cum = [0.0, 0.0, 0.0]
    print("per-segment:")
    for s in segs:
        L = s["end"] - s["start"]
        axis = s["cover"] + pipe_od_in / 24.0
        u = GAMMA_W * s["gw"]
        sig_v = max(0.0, s["gamma"] * axis - u)
        face = face_component_kips(cutter_od_in, s["k0"], sig_v, u)

        if s["mode"] == "tabulated":
            f = s["f"]
        elif s["mode"] == "arching":
            gamma_eff = s["gamma"] - GAMMA_W  # gw > 0 in all segs
            sig_n = arching_sigma_n_psf(D_ft, gamma_eff, s["c"], s["k0"], s["phi"], s["cover"])
            mu = math.tan(math.radians(s["phi"])) * s["lube"]
            f = (sig_n * mu,) * 3
            print(f"  arching: sigma_n={sig_n:.4f} psf mu={mu:.6f}")
        else:
            f_eq = s["W"] * s["mu"] / (math.pi * D_ft)
            f = (f_eq,) * 3

        area_per_ft = math.pi * D_ft
        fric = [ff * area_per_ft * L * s["curve"] / 1000.0 for ff in f]
        cum = [c + fr for c, fr in zip(cum, fric)]
        totals = [(c + face) * r for c, r in zip(cum, restart)]
        print(f"  seg {s['start']}-{s['end']}: face={face:.6f} kips "
              f"fric={[round(x,6) for x in fric]} cum={[round(x,6) for x in cum]} "
              f"totals={[round(x,6) for x in totals]}")

    max_face = max(
        face_component_kips(cutter_od_in, s["k0"],
                            max(0.0, s["gamma"] * (s["cover"] + pipe_od_in/24.0) - GAMMA_W*s["gw"]),
                            GAMMA_W*s["gw"])
        for s in segs)
    # high friction rate (kips/ft) incl restart high, governing segment
    rates = []
    for s in segs:
        L = s["end"] - s["start"]
        if s["mode"] == "tabulated":
            f = s["f"][2]
        elif s["mode"] == "arching":
            gamma_eff = s["gamma"] - GAMMA_W
            sig_n = arching_sigma_n_psf(D_ft, gamma_eff, s["c"], s["k0"], s["phi"], s["cover"])
            mu = math.tan(math.radians(s["phi"])) * s["lube"]
            f = sig_n * mu
        else:
            f = s["W"] * s["mu"] / (math.pi * D_ft)
        rates.append(f * math.pi * D_ft * L * s["curve"] / 1000.0 / L * restart[2])
    max_rate = max(rates)
    max_high = None
    # recompute totals for max: need cum at end; approximate via last seg totals printed above
    print(f"maxFaceKips={max_face:.6f}")
    print(f"maxFricRateHighKpf={max_rate:.6f}")

    # IJS: limit = min(pipeAllow 1200, ijsCap 900) = 900
    limit = 900.0
    max_face_high = max_face * restart[2]
    L1 = (limit - max_face_high) / max_rate
    Ln = limit / max_rate
    drive = 600.0
    count = 0 if drive <= L1 else 1 + math.ceil((drive - L1) / Ln)
    print(f"IJS: L1={L1:.6f} ft Ln={Ln:.6f} ft count={count}")

if __name__ == "__main__":
    main()
