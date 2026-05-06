"""
Tennis Serve Analysis — Flask Backend
======================================
Endpoints:
    POST /analyze          — upload video + court → full analysis JSON
    GET  /courts           — list available courts
    GET  /reference/<court>— pro reference stats for a court
    GET  /health           — server health check

Run:
    pip install flask flask-cors mediapipe opencv-python numpy pandas
    python app.py
"""

import os
import re
import uuid
import tempfile
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS

from extractor import extract_features
from surface_engine import analyze_serve, PRO_REFERENCE, COURTS, OUTLIER_LOG
from validator import validate_tennis_video

app = Flask(__name__)
CORS(app)  # allow frontend (any origin) to call these endpoints

ALLOWED_EXTENSIONS = {"mp4", "mov", "avi", "mkv"}
MAX_VIDEO_MB = 100

# Directory for annotated output videos (created on startup)
ANNOTATED_DIR = os.path.join(os.path.dirname(__file__), "annotated_videos")
os.makedirs(ANNOTATED_DIR, exist_ok=True)

def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

# ─────────────────────────────────────────────────────────────────────────────
# POST /analyze
# The main endpoint. Frontend sends:
#   - video file   (multipart form field: "video")
#   - court string (form field: "court")  → "grass" | "clay" | "hard"
#
# Returns full analysis JSON including deviation scores + projections.
# ─────────────────────────────────────────────────────────────────────────────

@app.route("/analyze", methods=["POST"])
def analyze():
    # ── 1. Validate inputs ────────────────────────────────────────────────────
    if "video" not in request.files:
        return jsonify({"error": "No video file provided. Send field name: 'video'"}), 400

    video_file = request.files["video"]
    court      = request.form.get("court", "").lower().strip()

    if not video_file.filename:
        return jsonify({"error": "Empty filename."}), 400

    if not allowed_file(video_file.filename):
        return jsonify({"error": f"Unsupported format. Allowed: {ALLOWED_EXTENSIONS}"}), 400

    if court not in COURTS:
        return jsonify({"error": f"Unknown court '{court}'. Must be one of: {COURTS}"}), 400

    # ── 2. Save video to temp file ─────────────────────────────────────────────
    suffix = "." + video_file.filename.rsplit(".", 1)[1].lower()
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        video_file.save(tmp.name)
        tmp_path = tmp.name

    # ── 3. Validate: confirm this is a tennis serve video ────────────────────
    try:
        validate_tennis_video(tmp_path)
    except ValueError as e:
        os.unlink(tmp_path)
        return jsonify({"error": str(e)}), 422
    except Exception as e:
        os.unlink(tmp_path)
        return jsonify({"error": f"Video validation error: {str(e)}"}), 500

    # ── 4. Extract features + generate annotated video ────────────────────────────
    video_id       = str(uuid.uuid4())
    annotated_path = os.path.join(ANNOTATED_DIR, f"{video_id}.mp4")

    try:
        features = extract_features(tmp_path, annotated_path=annotated_path)
    except ValueError as e:
        os.unlink(tmp_path)
        return jsonify({"error": f"Feature extraction failed: {str(e)}"}), 422
    except Exception as e:
        os.unlink(tmp_path)
        return jsonify({"error": f"Unexpected error during extraction: {str(e)}"}), 500
    finally:
        # always clean up the temp video
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)

    # ── 4. Run statistical analysis ───────────────────────────────────────────
    try:
        result = analyze_serve(features, court)
    except Exception as e:
        return jsonify({"error": f"Analysis failed: {str(e)}"}), 500

    # ── 5. Return result ──────────────────────────────────────────────────────
    return jsonify({
        "status":   "ok",
        "result":   result,
        "video_id": video_id,
    }), 200


# ─────────────────────────────────────────────────────────────────────────────
# GET /video/<video_id>
# Streams the annotated MP4 (with pose landmarks drawn) back to the frontend.
# ─────────────────────────────────────────────────────────────────────────────

@app.route("/video/<video_id>", methods=["GET"])
def get_video(video_id):
    if not re.match(r"^[0-9a-f\-]{36}$", video_id):
        return jsonify({"error": "Invalid video ID"}), 400
    video_path = os.path.join(ANNOTATED_DIR, f"{video_id}.mp4")
    if not os.path.exists(video_path):
        return jsonify({"error": "Video not found or expired"}), 404
    return send_file(video_path, mimetype="video/mp4", conditional=True)


# ─────────────────────────────────────────────────────────────────────────────
# GET /courts
# Returns the list of available courts and sample sizes.
# Frontend can use this to populate the court selector dropdown.
# ─────────────────────────────────────────────────────────────────────────────

@app.route("/courts", methods=["GET"])
def get_courts():
    return jsonify({
        "courts": COURTS,
        "sample_sizes": {
            court: {feat: PRO_REFERENCE[court][feat]["n"] for feat in PRO_REFERENCE[court]}
            for court in COURTS
        }
    }), 200


# ─────────────────────────────────────────────────────────────────────────────
# GET /reference/<court>
# Returns the pro reference stats (mean, std, n) for a specific court.
# Useful for the frontend to display what "elite" looks like.
# ─────────────────────────────────────────────────────────────────────────────

@app.route("/reference/<court>", methods=["GET"])
def get_reference(court):
    court = court.lower()
    if court not in COURTS:
        return jsonify({"error": f"Unknown court '{court}'. Available: {COURTS}"}), 404

    return jsonify({
        "court":     court,
        "reference": PRO_REFERENCE[court],
        "outliers_excluded": OUTLIER_LOG.get(court, []),
    }), 200


# ─────────────────────────────────────────────────────────────────────────────
# GET /health
# Simple check to confirm the server is running.
# ─────────────────────────────────────────────────────────────────────────────

@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "courts_loaded": COURTS,
    }), 200


# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("Starting Tennis Serve Analysis API...")
    print(f"Courts loaded: {COURTS}")
    app.run(debug=True, host="0.0.0.0", port=5000)
