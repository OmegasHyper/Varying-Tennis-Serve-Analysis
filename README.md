# 🎾 ServeSense — Tennis Serve Analysis System

A full-stack biomechanical analysis tool for tennis players and coaches.  
Upload a serve video, choose your court surface, and receive instant professional-grade feedback powered by **MediaPipe pose estimation**.

---

## 📸 Overview

ServeSense extracts 7 key biomechanical features from your serve video and compares them against an elite pro baseline (grass, clay, or hard court). It returns:

- **Per-feature scores** with performance bands (elite → critical)
- **Coaching tips** for each metric
- **Court surface projections** — how your serve translates to other surfaces
- **Overall weighted performance score** out of 100

---

## 🏗️ Project Structure

```
Varying-Tennis-Serve-Analysis/
├── backend/
│   ├── app.py              # Flask API — 4 endpoints
│   ├── extractor.py        # MediaPipe pose feature extraction
│   ├── surface_engine.py   # Statistical analysis engine + coaching
│   ├── validator.py        # Pre-flight tennis content check
│   └── requirements.txt    # Python dependencies
└── frontend/
    ├── src/
    │   ├── App.jsx                        # Main app + API integration
    │   ├── App.css                        # Global styles
    │   └── components/
    │       ├── ResultsDashboard.jsx       # Results layout
    │       ├── MetricCard.jsx             # Individual metric display
    │       ├── ComparisonRadar.jsx        # Radar chart (you vs. pro)
    │       ├── ComparisonBar.jsx          # Bar chart comparison
    │       ├── ProjectionPanel.jsx        # Cross-court projections
    │       ├── FeedbackPanel.jsx          # Coaching tips
    │       ├── HeroVideo.jsx              # Animated hero section
    │       └── ErrorBoundary.jsx          # React error boundary
    ├── index.html
    ├── vite.config.js
    └── package.json
```

---

## ⚙️ Setup & Running

### Backend

**Requirements:** Python 3.9+

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS / Linux

# Install dependencies
pip install -r requirements.txt

# Start the API server
python app.py
# → Running on http://localhost:5000
```

> **Note:** On first run, `extractor.py` will automatically download the MediaPipe pose model (~30 MB) into the `backend/` folder. This only happens once.

---

### Frontend

**Requirements:** Node.js 18+

```bash
cd frontend
npm install
npm run dev
# → Running on http://localhost:5173
```

---

## 🔌 API Endpoints

All endpoints are served from `http://localhost:5000`.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/analyze` | Upload video + court → full analysis JSON |
| `GET` | `/courts` | List available courts and sample sizes |
| `GET` | `/reference/<court>` | Pro reference stats for a specific court |
| `GET` | `/health` | Server health check |

### `POST /analyze`

**Request** — `multipart/form-data`:

| Field | Type | Values |
|-------|------|--------|
| `video` | file | `.mp4`, `.mov`, `.avi`, `.mkv` (max 100 MB) |
| `court` | string | `grass` \| `clay` \| `hard` |

**Response** `200 OK`:
```json
{
  "status": "ok",
  "result": {
    "source_court": "grass",
    "overall_score": 94.3,
    "feature_analysis": {
      "min_knee": {
        "label": "Min knee angle",
        "unit": "°",
        "user_value": 103.0,
        "pro_mean": 101.16,
        "pro_std": 6.22,
        "pro_n": 5,
        "z_score": 0.29,
        "performance_score": 96.0,
        "band": "elite",
        "pct_deviation": 1.8,
        "coaching_tip": "Knee loading depth is within elite range.",
        "weight": 1.0
      }
      // ... 6 more features
    },
    "projections": {
      "clay": [ { "feature": "min_knee", "current": 103.0, "projected": 104.2, ... } ],
      "hard": [ ... ]
    }
  }
}
```

**Error responses:**

| Code | Scenario |
|------|----------|
| `400` | Missing video or unsupported format |
| `400` | Unknown court type |
| `422` | No player detected in video |
| `422` | No serve motion detected |
| `422` | Feature extraction failed |
| `500` | Unexpected server error |

---

## 📊 Biomechanical Features

| Feature | Description | Unit |
|---------|-------------|------|
| `min_knee` | Minimum knee flexion angle (loading depth) | ° |
| `mean_knee` | Mean knee angle across the serve motion | ° |
| `max_jump` | Peak jump height | m |
| `mean_jump` | Mean jump height | m |
| `max_vel` | Peak knee angular velocity | °/s |
| `mean_vel` | Mean angular velocity (down-weighted, high variance) | °/s |
| `lat_disp` | Lateral hip displacement | m |

### Performance Bands

| Band | z-score range |
|------|---------------|
| Elite | \|z\| ≤ 0.5 |
| Proficient | \|z\| ≤ 1.0 |
| Developing | \|z\| ≤ 1.5 |
| Needs work | \|z\| ≤ 2.0 |
| Critical | \|z\| > 2.0 |

### Feature Weights (overall score)

`max_jump` and `max_vel` are weighted **×1.2** (strongest performance indicators).  
`mean_vel` is weighted **×0.5** (high cross-court variance, treated as directional only).

---

## 🛡️ Video Validation

Before full pose extraction, `validator.py` samples 8 evenly-spaced frames and checks:

1. **Player detected** — MediaPipe pose landmarks found in ≥ 2 frames
2. **Serve motion** — At least 1 frame shows a raised arm (wrist above nose level)

Invalid uploads are rejected with a `422` and a user-facing error message before any expensive processing begins.

---

## 🗃️ Pro Reference Data

| Court | Clean samples | Outliers excluded |
|-------|--------------|-------------------|
| Grass | 5 | 0 |
| Clay | 7 | 2 (pose failure, physically impossible jump) |
| Hard | 9 | 1 (tracking dropout — max_vel < 250°/s) |

Outlier exclusion is automatic via rules in `surface_engine.py` and does not require manual data editing.

---

## 🧰 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend framework | React 18 + Vite |
| Animations | Framer Motion + GSAP + ScrollTrigger |
| Charts | Recharts |
| HTTP client | Axios |
| Backend framework | Flask + Flask-CORS |
| Pose estimation | MediaPipe Pose Landmarker (Heavy, float16) |
| Video processing | OpenCV |
| Data processing | NumPy + Pandas |

---

## 👥 Authors

**Team 5 — Assistive Technologies**

---

*Built for athletes, by athletes.*
