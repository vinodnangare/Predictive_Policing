#!/usr/bin/env python3
import json
import os
import random
import sys
from collections import Counter
from datetime import datetime

import numpy as np
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score
from sklearn.preprocessing import StandardScaler


REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if REPO_ROOT not in sys.path:
    sys.path.append(REPO_ROOT)

from retrain_model import get_db, parse_coord_from_location, parse_crime_date  # noqa: E402


def load_env_file(path):
    if not os.path.exists(path):
        return

    with open(path, "r", encoding="utf-8") as f:
        for raw in f:
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            if key and key not in os.environ:
                os.environ[key] = value


def extract_records(docs):
    records = []
    skipped = Counter()

    for doc in docs:
        lat = doc.get("latitude")
        lon = doc.get("longitude")
        point = None

        try:
            if lat is not None and lon is not None:
                lat_f = float(lat)
                lon_f = float(lon)
                if -90 <= lat_f <= 90 and -180 <= lon_f <= 180:
                    point = (lat_f, lon_f)
        except (TypeError, ValueError):
            point = None

        if point is None:
            location = str(doc.get("location") or "").strip()
            if location:
                parsed = parse_coord_from_location(location)
                if parsed:
                    lat_f, lon_f = parsed
                    if -90 <= lat_f <= 90 and -180 <= lon_f <= 180:
                        point = (lat_f, lon_f)

        if point is None:
            skipped["no_valid_coordinates"] += 1
            continue

        parsed_date = parse_crime_date(doc.get("date"))
        if parsed_date is None:
            skipped["invalid_date"] += 1
            continue

        records.append(
            {
                "lat": float(point[0]),
                "lng": float(point[1]),
                "date": parsed_date,
            }
        )

    records.sort(key=lambda item: item["date"])
    return records, skipped


def choose_cluster_count(x_scaled):
    n_points = len(x_scaled)
    if n_points < 4:
        return 1, None, []

    upper = min(12, max(2, int(np.sqrt(n_points)) + 2))
    candidates = [k for k in range(2, upper + 1) if k < n_points]
    if not candidates:
        return 1, None, []

    best_k = 1
    best_score = -1.0
    for k in candidates:
        model = KMeans(n_clusters=k, random_state=42, n_init=20, max_iter=500)
        labels = model.fit_predict(x_scaled)
        if len(set(labels.tolist())) < 2:
            continue
        score = float(silhouette_score(x_scaled, labels))
        if score > best_score:
            best_score = score
            best_k = k

    if best_score < 0:
        return 1, None, candidates
    return best_k, best_score, candidates


def compute_cluster_radii_km(points, labels, centers):
    radii = []
    for idx, center in enumerate(centers):
        cluster_points = points[np.array(labels) == idx]
        if len(cluster_points) == 0:
            radii.append(0.25)
            continue

        dists_km = np.linalg.norm(cluster_points - center, axis=1) * 111.0
        if len(dists_km) == 1:
            radii.append(0.25)
            continue

        radius = max(0.25, float(np.mean(dists_km) + np.std(dists_km)))
        radii.append(radius)

    return radii


def predict_hotspot(point, centers, radii_km):
    point_arr = np.array([point[0], point[1]], dtype=float)
    for center, radius in zip(centers, radii_km):
        dist_km = float(np.linalg.norm(point_arr - center) * 111.0)
        if dist_km <= radius:
            return 1
    return 0


def generate_negative_points(n_needed, lat_bounds, lng_bounds, positives, seed=42):
    rng = random.Random(seed)
    negatives = []

    lat_min, lat_max = lat_bounds
    lng_min, lng_max = lng_bounds

    def is_far_from_positive(candidate):
        c_arr = np.array(candidate, dtype=float)
        for p in positives:
            p_arr = np.array(p, dtype=float)
            if np.linalg.norm(c_arr - p_arr) * 111.0 < 0.75:
                return False
        return True

    attempts = 0
    max_attempts = max(1000, n_needed * 50)
    while len(negatives) < n_needed and attempts < max_attempts:
        attempts += 1
        candidate = (
            rng.uniform(lat_min, lat_max),
            rng.uniform(lng_min, lng_max),
        )
        if is_far_from_positive(candidate):
            negatives.append(candidate)

    return negatives


def safe_div(numerator, denominator):
    if denominator == 0:
        return 0.0
    return float(numerator) / float(denominator)


def main():
    load_env_file(os.path.join(REPO_ROOT, ".env"))

    uri = (
        os.environ.get("DB_URL")
        or os.environ.get("MONGODB_URI")
        or os.environ.get("MONGO_URI")
        or "mongodb://localhost:27017/predictive_policing"
    )

    try:
        db = get_db(uri)
    except Exception as exc:
        print(json.dumps({"error": "Failed to connect to MongoDB", "details": str(exc)}))
        sys.exit(1)

    docs = list(db.get_collection("crimes").find({}))
    records, skipped = extract_records(docs)

    if len(records) < 20:
        print(
            json.dumps(
                {
                    "error": "Not enough valid records for evaluation",
                    "recordsFetched": len(docs),
                    "recordsValid": len(records),
                    "skipped": dict(skipped),
                }
            )
        )
        sys.exit(2)

    split_idx = max(1, int(len(records) * 0.8))
    if split_idx >= len(records):
        split_idx = len(records) - 1

    train = records[:split_idx]
    test = records[split_idx:]

    train_points = np.array([(r["lat"], r["lng"]) for r in train], dtype=float)
    test_points = [(r["lat"], r["lng"]) for r in test]

    scaler = StandardScaler()
    train_scaled = scaler.fit_transform(train_points)

    n_clusters, selection_silhouette, candidates = choose_cluster_count(train_scaled)

    model = KMeans(n_clusters=n_clusters, random_state=42, n_init=30, max_iter=600)
    model.fit(train_points)

    centers = model.cluster_centers_
    labels = model.labels_.tolist()
    radii_km = compute_cluster_radii_km(train_points, labels, centers)

    model_silhouette = None
    if n_clusters > 1 and len(set(labels)) > 1 and len(train_points) > n_clusters:
        model_silhouette = float(silhouette_score(train_scaled, np.array(labels)))

    all_lats = [r["lat"] for r in records]
    all_lngs = [r["lng"] for r in records]
    lat_margin = 0.05
    lng_margin = 0.05
    lat_bounds = (min(all_lats) - lat_margin, max(all_lats) + lat_margin)
    lng_bounds = (min(all_lngs) - lng_margin, max(all_lngs) + lng_margin)

    negative_points = generate_negative_points(
        n_needed=len(test_points),
        lat_bounds=lat_bounds,
        lng_bounds=lng_bounds,
        positives=test_points,
        seed=42,
    )

    if not negative_points:
        print(json.dumps({"error": "Failed to generate negative evaluation samples"}))
        sys.exit(3)

    y_true = [1] * len(test_points) + [0] * len(negative_points)
    y_pred = [predict_hotspot(p, centers, radii_km) for p in test_points] + [
        predict_hotspot(p, centers, radii_km) for p in negative_points
    ]

    tp = sum(1 for t, p in zip(y_true, y_pred) if t == 1 and p == 1)
    tn = sum(1 for t, p in zip(y_true, y_pred) if t == 0 and p == 0)
    fp = sum(1 for t, p in zip(y_true, y_pred) if t == 0 and p == 1)
    fn = sum(1 for t, p in zip(y_true, y_pred) if t == 1 and p == 0)

    accuracy = safe_div(tp + tn, tp + tn + fp + fn)
    precision = safe_div(tp, tp + fp)
    recall = safe_div(tp, tp + fn)
    f1 = safe_div(2 * precision * recall, precision + recall)

    output = {
        "summary": {
            "recordsFetched": int(len(docs)),
            "recordsValid": int(len(records)),
            "recordsSkipped": int(sum(skipped.values())),
            "trainSize": int(len(train_points)),
            "testSize": int(len(test_points)),
            "negativeSamples": int(len(negative_points)),
            "evaluationTimestamp": datetime.utcnow().isoformat() + "Z",
        },
        "model": {
            "algorithm": "KMeans",
            "selectedClusterCount": int(n_clusters),
            "candidateClusters": candidates,
            "selectionSilhouette": round(selection_silhouette, 4) if selection_silhouette is not None else None,
            "trainSilhouette": round(model_silhouette, 4) if model_silhouette is not None else None,
            "inertia": round(float(model.inertia_), 6),
            "clusterRadiiKm": [round(r, 4) for r in radii_km],
            "clusterSizes": {str(label): int(count) for label, count in sorted(Counter(labels).items())},
        },
        "confusionMatrix": {
            "TP": int(tp),
            "TN": int(tn),
            "FP": int(fp),
            "FN": int(fn),
        },
        "classificationMetrics": {
            "accuracy": round(accuracy, 4),
            "precision": round(precision, 4),
            "recall": round(recall, 4),
            "f1Score": round(f1, 4),
        },
        "notes": [
            "These classification metrics come from a temporal holdout + spatial hotspot hit-test protocol.",
            "They are proxy metrics for hotspot detection, not native supervised metrics from KMeans clustering.",
        ],
    }

    print(json.dumps(output))


if __name__ == "__main__":
    main()
