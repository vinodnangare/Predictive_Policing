#!/usr/bin/env python3
import json
import os
import random
import sys
import time

import numpy as np
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler


REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TOOLS_DIR = os.path.dirname(os.path.abspath(__file__))
if REPO_ROOT not in sys.path:
    sys.path.append(REPO_ROOT)
if TOOLS_DIR not in sys.path:
    sys.path.append(TOOLS_DIR)

from evaluate_hotspot_metrics import (  # noqa: E402
    choose_cluster_count,
    compute_cluster_radii_km,
    extract_records,
    generate_negative_points,
    load_env_file,
)
from retrain_model import get_db  # noqa: E402


def distance_km(point_a, point_b):
    return float(np.linalg.norm(np.array(point_a) - np.array(point_b)) * 111.0)


def optimized_predict(point, centers, radii_km):
    for center, radius in zip(centers, radii_km):
        if distance_km(point, center) <= radius:
            return 1
    return 0


def baseline_predict(point, train_points, radius_km=0.25):
    for tp in train_points:
        if distance_km(point, tp) <= radius_km:
            return 1
    return 0


def benchmark(predict_fn, points, repeats):
    total_calls = len(points) * repeats
    start_ns = time.perf_counter_ns()
    checksum = 0
    for _ in range(repeats):
        for point in points:
            checksum += int(predict_fn(point))
    elapsed_ns = time.perf_counter_ns() - start_ns
    elapsed_ms = elapsed_ns / 1_000_000.0
    avg_ms = elapsed_ms / max(1, total_calls)
    return elapsed_ms, avg_ms, checksum


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
    records, _ = extract_records(docs)
    if len(records) < 20:
        print(json.dumps({"error": "Not enough records for latency benchmark", "records": len(records)}))
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
    n_clusters, _, _ = choose_cluster_count(train_scaled)

    model = KMeans(n_clusters=n_clusters, random_state=42, n_init=30, max_iter=600)
    model.fit(train_points)

    centers = model.cluster_centers_
    labels = model.labels_.tolist()
    radii_km = compute_cluster_radii_km(train_points, labels, centers)

    all_lats = [r["lat"] for r in records]
    all_lngs = [r["lng"] for r in records]
    lat_bounds = (min(all_lats) - 0.05, max(all_lats) + 0.05)
    lng_bounds = (min(all_lngs) - 0.05, max(all_lngs) + 0.05)

    negatives = generate_negative_points(
        n_needed=len(test_points),
        lat_bounds=lat_bounds,
        lng_bounds=lng_bounds,
        positives=test_points,
        seed=42,
    )
    if not negatives:
        print(json.dumps({"error": "Failed to generate negatives for benchmark"}))
        sys.exit(3)

    query_points = test_points + negatives
    random.Random(42).shuffle(query_points)

    repeats = 2000

    baseline_elapsed_ms, baseline_avg_ms, baseline_checksum = benchmark(
        lambda p: baseline_predict(p, train_points, radius_km=0.25),
        query_points,
        repeats,
    )

    optimized_elapsed_ms, optimized_avg_ms, optimized_checksum = benchmark(
        lambda p: optimized_predict(p, centers, radii_km),
        query_points,
        repeats,
    )

    if baseline_avg_ms > 0:
        reduction_pct = ((baseline_avg_ms - optimized_avg_ms) / baseline_avg_ms) * 100.0
        speedup_x = baseline_avg_ms / optimized_avg_ms if optimized_avg_ms > 0 else None
    else:
        reduction_pct = 0.0
        speedup_x = None

    output = {
        "summary": {
            "records": len(records),
            "trainSize": len(train_points),
            "testSize": len(test_points),
            "negatives": len(negatives),
            "queryPoints": len(query_points),
            "repeats": repeats,
            "totalPredictionsPerMethod": len(query_points) * repeats,
        },
        "methods": {
            "baseline": {
                "name": "Naive point scan",
                "description": "Checks distance from query point against every training point.",
                "avgMsPerPrediction": round(baseline_avg_ms, 6),
                "totalElapsedMs": round(baseline_elapsed_ms, 3),
                "checksum": baseline_checksum,
            },
            "optimized": {
                "name": "Cluster centroid scan",
                "description": "Checks distance against selected cluster centers with learned radii.",
                "avgMsPerPrediction": round(optimized_avg_ms, 6),
                "totalElapsedMs": round(optimized_elapsed_ms, 3),
                "checksum": optimized_checksum,
                "clusterCount": int(n_clusters),
            },
        },
        "improvement": {
            "responseTimeReductionPercent": round(reduction_pct, 2),
            "speedupX": round(speedup_x, 2) if speedup_x is not None else None,
            "formula": "((baseline_avg - optimized_avg) / baseline_avg) * 100",
        },
        "notes": [
            "This benchmark is CPU-side hotspot prediction latency, measured under identical query workloads.",
            "Repeated runs (2,000 loops) reduce timer noise and provide stable averages.",
        ],
    }

    print(json.dumps(output))


if __name__ == "__main__":
    main()
