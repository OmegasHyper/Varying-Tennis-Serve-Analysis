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
import tempfile
from flask import Flask, request, jsonify
from flask_cors import CORS

from extractor import extract_features
from surface_engine import analyze_serve, PRO_REFERENCE, COURTS, OUTLIER_LOG

app = Flask(__name__)
CORS(app)  # allow frontend (any origin) to call these endpoints

ALLOWED_EXTENSIONS = {"mp4", "mov", "avi", "mkv"}
MAX_VIDEO_MB = 100

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

    # ── 3. Extract features with MediaPipe ────────────────────────────────────
    try:
        features = extract_features(tmp_path)
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
        "status":  "ok",
        "result":  result,
    }), 200


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
