"""
Surface-Aware Tennis Serve Analysis Engine  v3
===============================================
All three courts: grass (n=5), clay (n=7), hard (n=9 after outlier removal).

Features:
  min_knee    minimum knee flexion angle (degrees)
  mean_knee   mean knee angle across serve motion (degrees)
  max_jump    peak jump height (meters)
  mean_jump   mean jump height (meters)
  max_vel     peak knee angular velocity (deg/s)
  mean_vel    mean angular velocity (deg/s)  — high variance, use cautiously
  lat_disp    lateral hip displacement (meters)
"""

import math, json, statistics
from typing import Dict, List, Tuple

# ── Raw collected data ────────────────────────────────────────────────────────

RAW_DATA = {
    "grass": [
        {"min_knee":90.49,  "mean_knee":150.44, "max_jump":0.5815,"mean_jump":0.2159,"max_vel":464.70, "mean_vel":-29.998,"lat_disp":0.2625},
        {"min_knee":104.09, "mean_knee":142.21, "max_jump":0.6937,"mean_jump":0.3144,"max_vel":366.17, "mean_vel":-5.258, "lat_disp":0.2149},
        {"min_knee":102.20, "mean_knee":150.65, "max_jump":0.6003,"mean_jump":0.2331,"max_vel":390.59, "mean_vel":-12.637,"lat_disp":0.6438},
        {"min_knee":107.76, "mean_knee":145.32, "max_jump":0.5982,"mean_jump":0.2849,"max_vel":385.76, "mean_vel":11.311, "lat_disp":0.0194},
        {"min_knee":101.26, "mean_knee":150.43, "max_jump":0.6149,"mean_jump":0.2158,"max_vel":386.26, "mean_vel":-5.492, "lat_disp":0.5060},
    ],
    "clay": [
        # row 0 excluded: mean_jump=1.077m (implausible)
        {"min_knee":101.15,"mean_knee":165.08,"max_jump":1.8525,"mean_jump":1.0771,"max_vel":404.52,"mean_vel":4.693,  "lat_disp":0.3282},
        {"min_knee":104.73,"mean_knee":165.14,"max_jump":0.7745,"mean_jump":0.2850,"max_vel":440.28,"mean_vel":-1.025, "lat_disp":0.4157},
        # row 2 excluded: min_knee=48.32° pose failure, max_jump=3.29m impossible
        {"min_knee":48.32, "mean_knee":160.38,"max_jump":3.2893,"mean_jump":1.3744,"max_vel":729.60,"mean_vel":-10.176,"lat_disp":1.4713},
        {"min_knee":105.84,"mean_knee":157.26,"max_jump":0.5124,"mean_jump":0.2647,"max_vel":373.80,"mean_vel":0.287,  "lat_disp":0.0409},
        {"min_knee":102.06,"mean_knee":158.89,"max_jump":0.5279,"mean_jump":0.2223,"max_vel":403.50,"mean_vel":-1.925, "lat_disp":0.3188},
        {"min_knee":106.54,"mean_knee":143.99,"max_jump":0.5932,"mean_jump":0.2054,"max_vel":410.46,"mean_vel":-5.408, "lat_disp":0.2152},
        {"min_knee":110.47,"mean_knee":149.48,"max_jump":0.5936,"mean_jump":0.2202,"max_vel":313.34,"mean_vel":1.366,  "lat_disp":0.8495},
        {"min_knee":106.98,"mean_knee":147.94,"max_jump":0.6973,"mean_jump":0.2701,"max_vel":395.74,"mean_vel":26.977, "lat_disp":0.4009},
        {"min_knee":90.39, "mean_knee":144.63,"max_jump":0.6663,"mean_jump":0.2649,"max_vel":407.88,"mean_vel":-45.434,"lat_disp":0.1501},
    ],
    "hard": [
        {"min_knee":102.42,"mean_knee":145.77,"max_jump":0.6000,"mean_jump":0.2465,"max_vel":395.25, "mean_vel":-13.656,"lat_disp":0.1436},
        {"min_knee":102.39,"mean_knee":152.82,"max_jump":0.5867,"mean_jump":0.2025,"max_vel":415.66, "mean_vel":7.357,  "lat_disp":0.6956},
        {"min_knee":103.04,"mean_knee":142.33,"max_jump":0.6053,"mean_jump":0.2503,"max_vel":378.86, "mean_vel":-19.851,"lat_disp":0.1870},
        {"min_knee":103.34,"mean_knee":149.86,"max_jump":0.6199,"mean_jump":0.2281,"max_vel":428.92, "mean_vel":0.601,  "lat_disp":0.7307},
        {"min_knee":107.31,"mean_knee":151.23,"max_jump":0.6011,"mean_jump":0.2379,"max_vel":404.40, "mean_vel":-9.701, "lat_disp":0.1753},
        {"min_knee":105.91,"mean_knee":150.97,"max_jump":0.5700,"mean_jump":0.2063,"max_vel":412.91, "mean_vel":-6.253, "lat_disp":0.2514},
        {"min_knee":105.10,"mean_knee":145.64,"max_jump":0.4701,"mean_jump":0.1905,"max_vel":368.48, "mean_vel":-24.042,"lat_disp":0.0001},
        # row 7 excluded: max_vel=235 suspiciously low (likely tracking dropout)
        {"min_knee":115.67,"mean_knee":155.75,"max_jump":0.4195,"mean_jump":0.1656,"max_vel":235.08, "mean_vel":-0.536, "lat_disp":0.4488},
        {"min_knee":101.16,"mean_knee":160.11,"max_jump":0.4966,"mean_jump":0.1853,"max_vel":399.83, "mean_vel":1.674,  "lat_disp":0.7715},
        {"min_knee":98.81, "mean_knee":149.08,"max_jump":0.6890,"mean_jump":0.2634,"max_vel":365.51, "mean_vel":-3.721, "lat_disp":0.0044},
    ],
}

FEATURES = ["min_knee","mean_knee","max_jump","mean_jump","max_vel","mean_vel","lat_disp"]

FEATURE_META = {
    "min_knee":  {"label":"Min knee angle",          "unit":"°"},
    "mean_knee": {"label":"Mean knee angle",          "unit":"°"},
    "max_jump":  {"label":"Peak jump height",         "unit":"m"},
    "mean_jump": {"label":"Mean jump height",         "unit":"m"},
    "max_vel":   {"label":"Peak angular velocity",    "unit":"°/s"},
    "mean_vel":  {"label":"Mean angular velocity",    "unit":"°/s"},
    "lat_disp":  {"label":"Lateral hip displacement", "unit":"m"},
}

# mean_vel has high variance across all courts → lower weight in scoring
FEATURE_WEIGHTS = {
    "min_knee":  1.0,
    "mean_knee": 1.0,
    "max_jump":  1.2,   # strong performance indicator
    "mean_jump": 1.0,
    "max_vel":   1.2,   # strong performance indicator
    "mean_vel":  0.5,   # noisy, down-weighted
    "lat_disp":  0.8,
}

# ── Outlier detection ─────────────────────────────────────────────────────────

OUTLIER_RULES = [
    (lambda r: r["min_knee"] < 80,      "min_knee < 80° — likely pose detection failure"),
    (lambda r: r["max_jump"] > 2.0,     "max_jump > 2.0m — physically implausible"),
    (lambda r: r["mean_jump"] > 1.0,    "mean_jump > 1.0m — physically implausible"),
    (lambda r: r["lat_disp"] > 1.2,     "lat_disp > 1.2m — extreme lateral drift"),
    (lambda r: r["max_vel"] < 250,      "max_vel < 250°/s — likely tracking dropout"),
]

def check_outlier(row):
    for rule, reason in OUTLIER_RULES:
        if rule(row):
            return True, reason
    return False, ""

# ── Build reference stats ─────────────────────────────────────────────────────

def build_reference(raw):
    ref, log = {}, {}
    for court, rows in raw.items():
        clean, log[court] = [], []
        for i, row in enumerate(rows):
            flagged, reason = check_outlier(row)
            if flagged:
                log[court].append({"row": i, "reason": reason})
            else:
                clean.append(row)
        ref[court] = {}
        for f in FEATURES:
            vals = [r[f] for r in clean]
            ref[court][f] = {
                "mean": round(statistics.mean(vals), 4),
                "std":  round(statistics.stdev(vals) if len(vals) > 1 else 0.0, 4),
                "n":    len(vals),
            }
    return ref, log

PRO_REFERENCE, OUTLIER_LOG = build_reference(RAW_DATA)
COURTS = list(PRO_REFERENCE.keys())

# ── Transition matrix ─────────────────────────────────────────────────────────

def build_transition_matrix():
    matrix = {}
    for src in COURTS:
        matrix[src] = {}
        for tgt in COURTS:
            matrix[src][tgt] = {}
            for f in FEATURES:
                sm = PRO_REFERENCE[src][f]["mean"]
                tm = PRO_REFERENCE[tgt][f]["mean"]
                matrix[src][tgt][f] = round(tm / sm, 6) if sm != 0 else 1.0
    return matrix

TRANSITION_MATRIX = build_transition_matrix()

# ── Statistical core ──────────────────────────────────────────────────────────

def zscore(v, mean, std):
    return round((v - mean) / std, 3) if std > 0 else 0.0

def zscore_to_score(z):
    return round(100.0 * math.exp(-0.5 * z * z), 1)

def performance_band(z):
    a = abs(z)
    if a <= 0.5:  return "elite"
    if a <= 1.0:  return "proficient"
    if a <= 1.5:  return "developing"
    if a <= 2.0:  return "needs_work"
    return "critical"

def pct_deviation(v, mean):   # UI only — never used for scoring/projection
    return round((v - mean) / mean * 100, 1) if mean != 0 else 0.0

# ── Coaching rules ────────────────────────────────────────────────────────────

COACHING = {
    "min_knee":  {
        "high": "Minimum knee bend is above average — less flexion means less energy storage in the loading phase.",
        "low":  "Deep knee bend detected. Make sure this translates into explosive upward drive.",
        "ok":   "Knee loading depth is within elite range.",
    },
    "mean_knee": {
        "high": "Average knee angle is high — legs stay relatively straight. More dynamic flexion-extension improves power.",
        "low":  "Good dynamic knee range detected through the serve motion.",
        "ok":   "Overall knee movement pattern aligns with elite baseline.",
    },
    "max_jump":  {
        "high": "Jump height exceeds elite average — ensure control at peak doesn't compromise contact point.",
        "low":  "Peak jump height is below elite. Focus on more explosive leg drive from the trophy position.",
        "ok":   "Peak jump height is within elite range.",
    },
    "mean_jump": {
        "high": "High average elevation — check that sustained airtime doesn't disrupt balance at contact.",
        "low":  "Low mean jump height. Work on maintaining upward drive through the full swing.",
        "ok":   "Mean jump height is consistent with elite serve mechanics.",
    },
    "max_vel":   {
        "high": "Very high peak angular velocity — verify this isn't causing timing issues in the kinetic chain.",
        "low":  "Peak knee extension speed is below elite. Faster leg uncoiling directly increases racket head speed.",
        "ok":   "Peak angular velocity is in the elite range.",
    },
    "mean_vel":  {
        "high": "Strong net rotational drive throughout the serve.",
        "low":  "Low mean angular velocity — the extension phase may be slow or inconsistent.",
        "ok":   "Mean angular velocity is consistent with elite patterns.",
    },
    "lat_disp":  {
        "high": "Excessive lateral hip drift can destabilize the serve and hurt court positioning after the serve.",
        "low":  "Low lateral displacement — stable base. Confirm weight transfer is still driving forward.",
        "ok":   "Lateral displacement is within the elite range for this surface.",
    },
}

def coaching_tip(feature, z):
    r = COACHING.get(feature, {})
    return r.get("high" if z > 1 else "low" if z < -1 else "ok", "")

# ── Projection engine ─────────────────────────────────────────────────────────

def project_to_court(user_features, source, target):
    notes = []
    for f in FEATURES:
        if f not in user_features:
            continue
        current   = user_features[f]
        factor    = TRANSITION_MATRIX[source][target][f]
        projected = round(current * factor, 4)
        delta_pct = round((factor - 1) * 100, 1)
        abs_d     = abs(delta_pct)
        direction = "increase" if delta_pct > 1 else "decrease" if delta_pct < -1 else "maintain"
        priority  = "low" if direction=="maintain" else "medium" if abs_d < 5 else "high" if abs_d < 10 else "critical"
        notes.append({
            "feature":   f,
            "label":     FEATURE_META[f]["label"],
            "unit":      FEATURE_META[f]["unit"],
            "current":   current,
            "projected": projected,
            "delta_pct": delta_pct,
            "direction": direction,
            "priority":  priority,
        })
    notes.sort(key=lambda x: abs(x["delta_pct"]), reverse=True)
    return notes

# ── Main entry point ──────────────────────────────────────────────────────────

def analyze_serve(user_features: dict, source_court: str) -> dict:
    """
    Args:
        user_features : dict with keys = FEATURES list above
        source_court  : "grass" | "clay" | "hard"
    Returns:
        Full JSON-serializable analysis result
    """
    source_court = source_court.lower()
    assert source_court in COURTS, f"Unknown court '{source_court}'. Available: {COURTS}"

    ref = PRO_REFERENCE[source_court]
    feature_analysis = {}
    weighted_score_sum, weight_sum = 0.0, 0.0

    for f in FEATURES:
        if f not in user_features:
            continue
        v    = user_features[f]
        mean = ref[f]["mean"]
        std  = ref[f]["std"]
        z    = zscore(v, mean, std)
        sc   = zscore_to_score(z)
        w    = FEATURE_WEIGHTS[f]
        weighted_score_sum += sc * w
        weight_sum += w

        feature_analysis[f] = {
            "label":             FEATURE_META[f]["label"],
            "unit":              FEATURE_META[f]["unit"],
            "user_value":        v,
            "pro_mean":          mean,
            "pro_std":           std,
            "pro_n":             ref[f]["n"],
            "z_score":           z,
            "performance_score": sc,
            "band":              performance_band(z),
            "pct_deviation":     pct_deviation(v, mean),
            "coaching_tip":      coaching_tip(f, z),
            "weight":            w,
        }

    overall = round(weighted_score_sum / weight_sum, 1) if weight_sum > 0 else 0.0

    projections = {
        tgt: project_to_court(user_features, source_court, tgt)
        for tgt in COURTS if tgt != source_court
    }

    return {
        "source_court":     source_court,
        "user_features":    user_features,
        "overall_score":    overall,
        "feature_analysis": feature_analysis,
        "projections":      projections,
        "meta": {
            "outliers_excluded": OUTLIER_LOG,
            "sample_sizes":      {c: {f: PRO_REFERENCE[c][f]["n"] for f in FEATURES} for c in COURTS},
            "note_mean_vel":     "mean_vel carries 0.5 weight due to high cross-court variance. Treat projections for this feature as directional only.",
        },
    }

# ── CLI test ──────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("PRO REFERENCE  (mean ± std  |  n)")
    print(f"{'Feature':<28} {'Grass':>20} {'Clay':>20} {'Hard':>20}")
    print("─"*90)
    for f in FEATURES:
        row = []
        for c in COURTS:
            r = PRO_REFERENCE[c][f]
            row.append(f"{r['mean']:.3f}±{r['std']:.3f} n={r['n']}")
        print(f"{f:<28} {row[0]:>20} {row[1]:>20} {row[2]:>20}")

    print("\nOUTLIERS EXCLUDED:")
    for court, items in OUTLIER_LOG.items():
        for o in items:
            print(f"  [{court}] row {o['row']}: {o['reason']}")

    print("\nTRANSITION MATRIX  (factor = target_mean / source_mean)")
    print(f"{'Feature':<28} {'G→C':>9} {'G→H':>9} {'C→G':>9} {'C→H':>9} {'H→G':>9} {'H→C':>9}")
    print("─"*82)
    for f in FEATURES:
        def tf(s,t): return TRANSITION_MATRIX[s][t][f]
        print(f"{f:<28} {tf('grass','clay'):>+9.4f} {tf('grass','hard'):>+9.4f} "
              f"{tf('clay','grass'):>+9.4f} {tf('clay','hard'):>+9.4f} "
              f"{tf('hard','grass'):>+9.4f} {tf('hard','clay'):>+9.4f}")

    print("\n─"*50)
    print("SAMPLE: grass player projecting to clay & hard")
    print("─"*50)
    sample = {"min_knee":103.0,"mean_knee":146.0,"max_jump":0.60,
              "mean_jump":0.25,"max_vel":380.0,"mean_vel":-8.0,"lat_disp":0.30}
    result = analyze_serve(sample, "grass")
    print(f"Overall score (vs grass baseline): {result['overall_score']} / 100\n")
    for f, d in result["feature_analysis"].items():
        print(f"  {f:<28} z={d['z_score']:+.2f}  {d['band']:<12}  score={d['performance_score']}")
    for tgt in ["clay","hard"]:
        print(f"\n  → Projection grass to {tgt}:")
        for n in result["projections"][tgt]:
            arrow = "↑" if n["direction"]=="increase" else "↓" if n["direction"]=="decrease" else "–"
            print(f"    [{n['priority']:<8}] {n['label']:<28} {n['current']} → {n['projected']} {n['unit']}  ({n['delta_pct']:+.1f}%) {arrow}")
