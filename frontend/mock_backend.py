"""
ServeSense Mock Backend
=====================
Simulates the /analyze endpoint for frontend development & testing.

Run with:
    uvicorn mock_backend:app --reload --port 8000
"""

import asyncio
import random
from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="ServeSense Mock Backend", version="1.0.0")

# ── CORS ─────────────────────────────────────────────────────────────────────
# Regex covers any localhost port so Vite port bumps (5173, 5174…) never break requests.
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Court-specific pro baselines & reference players ──────────────────────────
COURT_PROFILES = {
    "clay": {
        "reference_player": "Federer",
        "pro_baseline": {
            "jump_height_cm": 38.2,
            "knee_flexion_angle_deg": 41.0,
            "knee_angular_velocity_deg_s": 580,
            "horizontal_displacement_m": 0.38,
            "ball_speed_kmh": 195,
        },
        "projection_courts": ["grass", "hard"],
    },
    "grass": {
        "reference_player": "Djokovic",
        "pro_baseline": {
            "jump_height_cm": 36.5,
            "knee_flexion_angle_deg": 38.5,
            "knee_angular_velocity_deg_s": 610,
            "horizontal_displacement_m": 0.34,
            "ball_speed_kmh": 210,
        },
        "projection_courts": ["clay", "hard"],
    },
    "hard": {
        "reference_player": "Nadal",
        "pro_baseline": {
            "jump_height_cm": 37.0,
            "knee_flexion_angle_deg": 39.5,
            "knee_angular_velocity_deg_s": 595,
            "horizontal_displacement_m": 0.36,
            "ball_speed_kmh": 200,
        },
        "projection_courts": ["clay", "grass"],
    },
}

# ── Feedback templates per court ──────────────────────────────────────────────
FEEDBACK_POOL = {
    "clay": [
        "Increase knee flexion to match elite clay baseline",
        "Improve lower-body compression for better clay stability",
        "Work on extending rally endurance — clay rewards consistency",
        "Focus on high-bouncing ball preparation and shoulder rotation",
        "Increase racket head speed during topspin groundstrokes",
    ],
    "grass": [
        "Shorten your backswing to handle the fast, low bounce",
        "Stay low through the shot — grass rewards flat driving strokes",
        "Improve net approach footwork for serve-and-volley patterns",
        "Increase horizontal displacement speed for wide serve recovery",
        "Work on slice backhand for effective low-ball neutralization",
    ],
    "hard": [
        "Balance between clay and grass techniques for all-surface adaptability",
        "Increase first-serve percentage to control hard-court rallies",
        "Work on split-step timing to improve reaction off the bounce",
        "Improve angular velocity during groundstrokes for more pace",
        "Focus on consistent ball toss for improved serve placement",
    ],
}


def jitter(value: float, pct: float = 0.08) -> float:
    """Add ±pct% random variation to simulate real measurement noise."""
    return round(value * (1 + random.uniform(-pct, pct)), 2)


def compute_user_features(profile: dict) -> dict:
    """Generate realistic user features ~8–15% below the pro baseline."""
    baseline = profile["pro_baseline"]
    deficit = random.uniform(0.06, 0.15)   # 6–15% deficit per session
    return {
        k: jitter(v * (1 - deficit))
        for k, v in baseline.items()
    }


def compute_comparison(user: dict, baseline: dict) -> dict:
    """Percentage difference vs pro baseline (negative = below pro)."""
    return {
        k: round(((user[k] - baseline[k]) / baseline[k]) * 100, 1)
        for k in user
    }


def compute_projection(user: dict, current_court: str, target_court: str) -> dict:
    """
    Project user performance onto a different surface by applying
    court-specific adjustment factors.
    """
    ADJUSTMENT = {
        # (from_court, to_court): {metric: factor}
        ("clay", "grass"): {
            "jump_height_cm": 1.11,
            "knee_flexion_angle_deg": 0.95,
            "horizontal_displacement_m": 1.14,
            "ball_speed_kmh": 1.027,
        },
        ("clay", "hard"): {
            "jump_height_cm": 1.06,
            "knee_flexion_angle_deg": 0.995,
            "horizontal_displacement_m": 1.057,
            "ball_speed_kmh": 1.016,
        },
        ("grass", "clay"): {
            "jump_height_cm": 0.90,
            "knee_flexion_angle_deg": 1.05,
            "horizontal_displacement_m": 0.87,
            "ball_speed_kmh": 0.97,
        },
        ("grass", "hard"): {
            "jump_height_cm": 0.95,
            "knee_flexion_angle_deg": 1.025,
            "horizontal_displacement_m": 0.94,
            "ball_speed_kmh": 0.988,
        },
        ("hard", "clay"): {
            "jump_height_cm": 0.93,
            "knee_flexion_angle_deg": 1.04,
            "horizontal_displacement_m": 0.90,
            "ball_speed_kmh": 0.975,
        },
        ("hard", "grass"): {
            "jump_height_cm": 1.05,
            "knee_flexion_angle_deg": 0.96,
            "horizontal_displacement_m": 1.08,
            "ball_speed_kmh": 1.05,
        },
    }

    factors = ADJUSTMENT.get((current_court, target_court), {})
    projected_keys = ["jump_height_cm", "knee_flexion_angle_deg",
                      "horizontal_displacement_m", "ball_speed_kmh"]
    return {
        k: round(jitter(user[k] * factors.get(k, 1.0), 0.02), 2)
        for k in projected_keys
        if k in user
    }


@app.get("/")
async def root():
    return {"status": "ServeSense Mock Backend is running 🎾"}


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/analyze")
async def analyze(
    video: UploadFile = File(...),
    court_type: str = Form(...),
):
    # Validate court type
    court_type = court_type.lower().strip()
    if court_type not in COURT_PROFILES:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=422,
            detail=f"Invalid court_type '{court_type}'. Must be one of: clay, grass, hard."
        )

    # Simulate processing delay (3 seconds)
    await asyncio.sleep(3)

    profile = COURT_PROFILES[court_type]
    pro_baseline = profile["pro_baseline"]
    user_features = compute_user_features(profile)
    comparison_to_pro = compute_comparison(user_features, pro_baseline)

    # Build court projections for the OTHER two surfaces
    court_projection = {}
    for target in profile["projection_courts"]:
        court_projection[target] = compute_projection(user_features, court_type, target)

    # Pick 2 random feedback items from the pool
    feedback = random.sample(FEEDBACK_POOL[court_type], k=2)

    return {
        "metadata": {
            "court_type": court_type,
            "reference_player": profile["reference_player"],
            "video_filename": video.filename,
            "content_type": video.content_type,
        },
        "user_features": user_features,
        "pro_baseline": pro_baseline,
        "comparison_to_pro": comparison_to_pro,
        "court_projection": court_projection,
        "feedback": feedback,
    }
