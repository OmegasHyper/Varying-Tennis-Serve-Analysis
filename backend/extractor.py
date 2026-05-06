"""
Feature Extractor
=================
Your original Colab MediaPipe code, refactored into a single callable function.
Takes a video file path, returns the feature dict that goes into analyze_serve().

Output keys match exactly what surface_engine.py expects:
    min_knee, mean_knee, max_jump, mean_jump,
    max_vel, mean_vel, lat_disp
"""

import cv2
import numpy as np
import pandas as pd
import mediapipe as mp
import tempfile
import os
import urllib.request

try:
    import imageio
    _IMAGEIO_OK = True
except ImportError:
    _IMAGEIO_OK = False

# ── Download model once on first import ──────────────────────────────────────

MODEL_PATH = os.path.join(os.path.dirname(__file__), "pose_landmarker.task")

def ensure_model():
    if not os.path.exists(MODEL_PATH):
        print("Downloading MediaPipe pose model...")
        url = (
            "https://storage.googleapis.com/mediapipe-models/"
            "pose_landmarker/pose_landmarker_heavy/float16/1/pose_landmarker_heavy.task"
        )
        urllib.request.urlretrieve(url, MODEL_PATH)
        print("Model ready.")

# ── Landmarks we care about ───────────────────────────────────────────────────

TARGET_LANDMARKS = {
    23: "left_hip", 24: "right_hip",
    25: "left_knee", 26: "right_knee",
    27: "left_ankle", 28: "right_ankle",
}

# ── Overlay drawing constants ─────────────────────────────────────────────────

_NAME_TO_IDX = {v: k for k, v in TARGET_LANDMARKS.items()}

SKELETON_CONNECTIONS = [
    ("left_hip",   "left_knee"),
    ("left_knee",  "left_ankle"),
    ("right_hip",  "right_knee"),
    ("right_knee", "right_ankle"),
    ("left_hip",   "right_hip"),
]

_JOINT_COLOR    = ( 82, 245, 212)   # BGR: cyan-green fill
_SKELETON_COLOR = ( 50, 220, 100)   # BGR: green line
_WHITE          = (255, 255, 255)


def _draw_pose(frame, landmarks, width, height):
    """Draw skeleton lines + joint circles onto a BGR frame (in-place)."""
    # Connections
    for a, b in SKELETON_CONNECTIONS:
        ai, bi = _NAME_TO_IDX.get(a), _NAME_TO_IDX.get(b)
        if ai is None or bi is None:
            continue
        lm_a, lm_b = landmarks[ai], landmarks[bi]
        pt1 = (int(lm_a.x * width), int(lm_a.y * height))
        pt2 = (int(lm_b.x * width), int(lm_b.y * height))
        cv2.line(frame, pt1, pt2, _SKELETON_COLOR, 2, cv2.LINE_AA)
    # Joints
    for idx in TARGET_LANDMARKS:
        lm = landmarks[idx]
        cx, cy = int(lm.x * width), int(lm.y * height)
        cv2.circle(frame, (cx, cy), 6, _JOINT_COLOR, -1, cv2.LINE_AA)
        cv2.circle(frame, (cx, cy), 8, _WHITE, 1, cv2.LINE_AA)

# ── Geometry helper ───────────────────────────────────────────────────────────

def calculate_angle(a, b, c):
    """Angle at point b, given three 2D points a, b, c."""
    a, b, c = np.array(a), np.array(b), np.array(c)
    ba, bc = a - b, c - b
    cosine = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc) + 1e-9)
    return round(float(np.degrees(np.arccos(np.clip(cosine, -1.0, 1.0)))), 2)

# ── Main extraction function ──────────────────────────────────────────────────

def extract_features(video_path: str, annotated_path: str = None) -> dict:
    """
    Run MediaPipe on a video file and return the biomechanical feature dict.

    Args:
        video_path:     absolute path to the uploaded video file
        annotated_path: optional path to write an annotated MP4 with pose overlay

    Returns:
        {
            "min_knee":  float,   # degrees
            "mean_knee": float,   # degrees
            "max_jump":  float,   # meters
            "mean_jump": float,   # meters
            "max_vel":   float,   # deg/s
            "mean_vel":  float,   # deg/s
            "lat_disp":  float,   # meters
            "px_to_meter": float  # scale factor (for debugging)
        }

    Raises:
        ValueError if the video cannot be read or no pose is detected.
    """
    ensure_model()

    BaseOptions         = mp.tasks.BaseOptions
    PoseLandmarker      = mp.tasks.vision.PoseLandmarker
    PoseLandmarkerOptions = mp.tasks.vision.PoseLandmarkerOptions
    VisionRunningMode   = mp.tasks.vision.RunningMode

    # ── Open video ────────────────────────────────────────────────────────────
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError(f"Cannot open video: {video_path}")

    fps    = cap.get(cv2.CAP_PROP_FPS) or 30.0
    width  = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    cap.release()

    # ── Run MediaPipe and collect landmarks ───────────────────────────────────
    rows = []
    options = PoseLandmarkerOptions(
        base_options=BaseOptions(model_asset_path=MODEL_PATH),
        running_mode=VisionRunningMode.VIDEO,
    )

    cap = cv2.VideoCapture(video_path)

    # ── Optional annotated video writer ───────────────────────────────────────
    writer    = None
    _use_iio  = False
    if annotated_path:
        if _IMAGEIO_OK:
            try:
                writer = imageio.get_writer(
                    annotated_path,
                    fps=fps,
                    codec="libx264",
                    quality=None,
                    ffmpeg_params=["-movflags", "+faststart",
                                   "-pix_fmt",   "yuv420p",
                                   "-crf",        "23"],
                )
                _use_iio = True
            except Exception:
                pass   # fall back to OpenCV
        if not _use_iio:
            fourcc = cv2.VideoWriter_fourcc(*"mp4v")
            writer = cv2.VideoWriter(annotated_path, fourcc, fps, (width, height))

    with PoseLandmarker.create_from_options(options) as landmarker:
        frame_index = 0
        while cap.isOpened():
            success, frame = cap.read()
            if not success:
                break
            rgb   = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
            ts_ms = int((frame_index / fps) * 1000)
            det   = landmarker.detect_for_video(image, ts_ms)

            if det.pose_landmarks:
                for idx, name in TARGET_LANDMARKS.items():
                    lm = det.pose_landmarks[0][idx]
                    rows.append({
                        "frame": frame_index,
                        "landmark": name,
                        "x": round(lm.x * width, 2),
                        "y": round(lm.y * height, 2),
                    })

            # Write annotated frame (draw pose if detected)
            if writer is not None:
                annotated = frame.copy()
                if det.pose_landmarks:
                    _draw_pose(annotated, det.pose_landmarks[0], width, height)
                if _use_iio:
                    writer.append_data(cv2.cvtColor(annotated, cv2.COLOR_BGR2RGB))
                else:
                    writer.write(annotated)

            frame_index += 1

    if writer is not None:
        writer.close() if _use_iio else writer.release()
    cap.release()

    if not rows:
        raise ValueError("No pose landmarks detected in video.")

    df = pd.DataFrame(rows)

    # ── Pixel-to-meter calibration ────────────────────────────────────────────
    first_frame_data = df[df["frame"] == df["frame"].min()]
    lh = first_frame_data[first_frame_data["landmark"] == "left_hip"]["y"].values
    la = first_frame_data[first_frame_data["landmark"] == "left_ankle"]["y"].values

    if len(lh) > 0 and len(la) > 0:
        half_body_px  = abs(la[0] - lh[0])
        px_to_meter   = 0.94 / half_body_px if half_body_px > 0 else 1.0
    else:
        px_to_meter = 1.0

    # ── Knee angles ───────────────────────────────────────────────────────────
    knee_angles = []
    for frame in df["frame"].unique():
        fd = df[df["frame"] == frame]

        def get_pt(name):
            r = fd[fd["landmark"] == name]
            return [r["x"].values[0], r["y"].values[0]] if not r.empty else None

        lhip, lknee, lankle = get_pt("left_hip"), get_pt("left_knee"), get_pt("left_ankle")
        if all([lhip, lknee, lankle]):
            knee_angles.append({
                "frame": frame,
                "left_knee_angle": calculate_angle(lhip, lknee, lankle),
            })

    if not knee_angles:
        raise ValueError("Could not compute knee angles — check landmark visibility.")

    knee_df = pd.DataFrame(knee_angles)

    # ── Angular velocity (smoothed) ───────────────────────────────────────────
    knee_df["angular_velocity"] = knee_df["left_knee_angle"].diff() / (1.0 / fps)
    knee_df["angular_velocity"] = (
        knee_df["angular_velocity"].rolling(window=5, center=True).mean()
    )

    # ── Jump height ───────────────────────────────────────────────────────────
    jump_rows = []
    for frame in df["frame"].unique():
        fd   = df[df["frame"] == frame]
        lh_y = fd[fd["landmark"] == "left_hip"]["y"].values
        rh_y = fd[fd["landmark"] == "right_hip"]["y"].values
        if len(lh_y) > 0 and len(rh_y) > 0:
            jump_rows.append({"frame": frame, "hip_y": (lh_y[0] + rh_y[0]) / 2})

    jump_df          = pd.DataFrame(jump_rows)
    baseline_y       = jump_df["hip_y"].max()
    jump_df["jump_height_px"] = baseline_y - jump_df["hip_y"]

    # ── Lateral hip displacement ──────────────────────────────────────────────
    lat_rows = []
    for frame in df["frame"].unique():
        fd   = df[df["frame"] == frame]
        lh_x = fd[fd["landmark"] == "left_hip"]["x"].values
        rh_x = fd[fd["landmark"] == "right_hip"]["x"].values
        if len(lh_x) > 0 and len(rh_x) > 0:
            lat_rows.append({"frame": frame, "hip_x": (lh_x[0] + rh_x[0]) / 2})

    lat_df = pd.DataFrame(lat_rows)
    lat_df["hip_x_smooth"] = (
        lat_df["hip_x"].rolling(window=5, center=True).mean()
        .bfill().ffill()
    )
    start_x          = lat_df["hip_x_smooth"].iloc[0]
    lat_df["movement"] = abs(lat_df["hip_x_smooth"] - start_x)
    moving            = lat_df[lat_df["movement"] > 10]

    if not moving.empty:
        x_start = lat_df[lat_df["frame"] == moving["frame"].min()]["hip_x_smooth"].values[0]
        x_end   = lat_df[lat_df["frame"] == moving["frame"].max()]["hip_x_smooth"].values[0]
        lat_disp_m = round(abs(x_end - x_start) * px_to_meter, 4)
    else:
        lat_disp_m = 0.0

    # ── Assemble feature dict ─────────────────────────────────────────────────
    features = {
        "min_knee":    round(float(knee_df["left_knee_angle"].min()),  3),
        "mean_knee":   round(float(knee_df["left_knee_angle"].mean()), 3),
        "max_jump":    round(float(jump_df["jump_height_px"].max() * px_to_meter), 4),
        "mean_jump":   round(float(jump_df["jump_height_px"].mean() * px_to_meter), 4),
        "max_vel":     round(float(knee_df["angular_velocity"].max(skipna=True)), 3),
        "mean_vel":    round(float(knee_df["angular_velocity"].mean(skipna=True)), 3),
        "lat_disp":    lat_disp_m,
        "px_to_meter": round(px_to_meter, 4),
    }

    return features
