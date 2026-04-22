#!/usr/bin/env python3
import json
import os
import textwrap
from datetime import datetime

from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas


BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RETRAIN_JSON = os.path.join(BASE_DIR, "retrain_stdout.json")
EVAL_JSON = os.path.join(BASE_DIR, "evaluate_metrics_stdout.json")
LATENCY_JSON = os.path.join(BASE_DIR, "latency_benchmark_stdout.json")
OUTPUT_PDF = os.path.join(BASE_DIR, "Project_Review_Complete_Handbook.pdf")


def load_json(path):
    if not os.path.exists(path):
        return {}
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def safe_float(value, default=0.0):
    try:
        return float(value)
    except Exception:
        return default


def pct(value):
    return f"{value:.2f}%"


def add_section(lines, title):
    lines.append(("heading", title))


def add_bullet(lines, text):
    lines.append(("bullet", text))


def build_lines():
    retrain = load_json(RETRAIN_JSON)
    evaluation = load_json(EVAL_JSON)
    latency = load_json(LATENCY_JSON)

    train_metrics = retrain.get("metrics", {})
    eval_summary = evaluation.get("summary", {})
    eval_model = evaluation.get("model", {})
    cm = evaluation.get("confusionMatrix", {})
    clf = evaluation.get("classificationMetrics", {})
    latency_methods = latency.get("methods", {})
    latency_improvement = latency.get("improvement", {})

    tp = int(cm.get("TP", 0))
    tn = int(cm.get("TN", 0))
    fp = int(cm.get("FP", 0))
    fn = int(cm.get("FN", 0))
    total = max(1, tp + tn + fp + fn)

    accuracy = safe_float(clf.get("accuracy", 0.0))
    precision = safe_float(clf.get("precision", 0.0))
    recall = safe_float(clf.get("recall", 0.0))
    f1 = safe_float(clf.get("f1Score", 0.0))

    baseline_accuracy = 0.50
    accuracy_lift_points = (accuracy - baseline_accuracy) * 100.0
    accuracy_lift_percent = ((accuracy - baseline_accuracy) / baseline_accuracy) * 100.0 if baseline_accuracy > 0 else 0.0

    baseline_avg_ms = safe_float(latency_methods.get("baseline", {}).get("avgMsPerPrediction", 0.0))
    optimized_avg_ms = safe_float(latency_methods.get("optimized", {}).get("avgMsPerPrediction", 0.0))
    response_reduction_pct = safe_float(latency_improvement.get("responseTimeReductionPercent", 0.0))
    speedup_x = safe_float(latency_improvement.get("speedupX", 0.0))

    lines = []
    lines.append(("title", "Predictive Policing: Complete Project Review Handbook"))
    lines.append(("text", f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"))
    lines.append(("text", "This document contains model metrics, full formulas, proof values, dashboard graph logic, and viva questions in simple words."))

    add_section(lines, "A) Evidence Snapshot")
    add_bullet(lines, "Primary proof files used for all numbers in this report:")
    add_bullet(lines, "1) server/retrain_stdout.json")
    add_bullet(lines, "2) server/evaluate_metrics_stdout.json")
    add_bullet(lines, "3) server/latency_benchmark_stdout.json")
    add_bullet(lines, "Code proof files:")
    add_bullet(lines, "- server/retrain_model.py")
    add_bullet(lines, "- server/tools/evaluate_hotspot_metrics.py")
    add_bullet(lines, "- server/tools/benchmark_prediction_latency.py")

    add_section(lines, "B) Which Clustering Is Used and Why")
    add_bullet(lines, "Algorithm: KMeans clustering on geospatial coordinates (latitude, longitude).")
    add_bullet(lines, "Code proof: server/retrain_model.py:14, server/retrain_model.py:475")
    add_bullet(lines, "Cluster count is selected using silhouette score on candidate k values.")
    add_bullet(lines, "Code proof: server/retrain_model.py:458, server/retrain_model.py:626, server/retrain_model.py:629")
    add_bullet(lines, "Why KMeans here: centroid output is easy to show as hotspot centers on map and fast for prediction-time checks.")

    add_section(lines, "C) Native Model Metrics (from retraining output)")
    add_bullet(lines, f"Records fetched: {train_metrics.get('recordsFetched', 'N/A')}")
    add_bullet(lines, f"Records used: {train_metrics.get('recordsUsed', 'N/A')}")
    add_bullet(lines, f"Records skipped: {train_metrics.get('recordsSkipped', 'N/A')}")
    add_bullet(lines, f"Coverage percent: {train_metrics.get('coveragePercent', 'N/A')}%")
    add_bullet(lines, f"Direct coordinate hits: {train_metrics.get('directCoordinateHits', 'N/A')}")
    add_bullet(lines, f"Geocoded hits: {train_metrics.get('geocodedHits', 'N/A')}")
    add_bullet(lines, f"Cluster count: {train_metrics.get('clusterCount', 'N/A')}")
    add_bullet(lines, f"Cluster sizes: {train_metrics.get('clusterSizes', 'N/A')}")
    add_bullet(lines, f"Silhouette score: {train_metrics.get('silhouetteScore', 'N/A')}")
    add_bullet(lines, f"Model inertia: {train_metrics.get('modelInertia', 'N/A')}")
    add_bullet(lines, f"Avg cluster spread (km): {train_metrics.get('avgClusterSpreadKm', 'N/A')}")

    add_section(lines, "D) Accuracy, Precision, Recall, F1 with Full Proof")
    add_bullet(lines, "These are computed through temporal holdout + spatial hit-testing (proxy evaluation for unsupervised model).")
    add_bullet(lines, "Code proof for formulas: server/tools/evaluate_hotspot_metrics.py:263-266")
    add_bullet(lines, f"Train size: {eval_summary.get('trainSize', 'N/A')}, Test size: {eval_summary.get('testSize', 'N/A')}, Negatives: {eval_summary.get('negativeSamples', 'N/A')}")
    add_bullet(lines, f"Confusion matrix: TP={tp}, TN={tn}, FP={fp}, FN={fn}")
    add_bullet(lines, "Formula 1: Accuracy = (TP + TN) / (TP + TN + FP + FN)")
    add_bullet(lines, f"Proof: ({tp} + {tn}) / ({tp} + {tn} + {fp} + {fn}) = {(tp + tn) / total:.4f} ({pct(((tp + tn) / total) * 100)})")
    add_bullet(lines, "Formula 2: Precision = TP / (TP + FP)")
    add_bullet(lines, f"Proof: {tp} / ({tp} + {fp}) = {precision:.4f} ({pct(precision * 100)})")
    add_bullet(lines, "Formula 3: Recall = TP / (TP + FN)")
    add_bullet(lines, f"Proof: {tp} / ({tp} + {fn}) = {recall:.4f} ({pct(recall * 100)})")
    add_bullet(lines, "Formula 4: F1 = 2 * Precision * Recall / (Precision + Recall)")
    add_bullet(lines, f"Proof: 2 * {precision:.4f} * {recall:.4f} / ({precision:.4f} + {recall:.4f}) = {f1:.4f} ({pct(f1 * 100)})")

    add_section(lines, "E) Improved Prediction Accuracy Percentage (with proof)")
    add_bullet(lines, "Defined baseline: always-majority prediction on balanced test set (27 positives, 27 negatives), accuracy = 50%.")
    add_bullet(lines, "Reason: evaluation set is balanced, so naive constant predictor yields 27/54 correct.")
    add_bullet(lines, f"Current accuracy = {pct(accuracy * 100)}")
    add_bullet(lines, f"Improvement (percentage points) = {pct(accuracy_lift_points)}")
    add_bullet(lines, f"Relative improvement (%) = (({accuracy:.4f} - 0.5000) / 0.5000) * 100 = {pct(accuracy_lift_percent)}")

    add_section(lines, "F) Response Time Reduction Percentage (with proof)")
    add_bullet(lines, "Benchmark method compares two prediction paths on same workload:")
    add_bullet(lines, "1) Baseline naive point scan against all training points")
    add_bullet(lines, "2) Optimized cluster-centroid scan")
    add_bullet(lines, "Code proof: server/tools/benchmark_prediction_latency.py")
    add_bullet(lines, f"Baseline avg latency per prediction: {baseline_avg_ms:.6f} ms")
    add_bullet(lines, f"Optimized avg latency per prediction: {optimized_avg_ms:.6f} ms")
    add_bullet(lines, "Formula: response time reduction % = ((baseline - optimized) / baseline) * 100")
    add_bullet(lines, f"Proof: (({baseline_avg_ms:.6f} - {optimized_avg_ms:.6f}) / {baseline_avg_ms:.6f}) * 100 = {pct(response_reduction_pct)}")
    add_bullet(lines, f"Speedup factor = baseline / optimized = {speedup_x:.2f}x")

    add_section(lines, "G) Dashboard and Graph Calculations (Simple Explanation + Proof Location)")
    add_bullet(lines, "1) Police Dashboard (pages/PoliceDashboard.jsx)")
    add_bullet(lines, "- Incidents in 24h and 7d are counted by checking timestamp difference from current time.")
    add_bullet(lines, "- Proof: client/src/pages/PoliceDashboard.jsx:145-169")
    add_bullet(lines, "- Case status mix buckets: Open/Assigned/Investigating/Closed.")
    add_bullet(lines, "- Proof: client/src/pages/PoliceDashboard.jsx:47-58")
    add_bullet(lines, "2) Crime Analytics charts (components/CrimeAnalytics.jsx)")
    add_bullet(lines, "- State chart = count of records per normalized state.")
    add_bullet(lines, "- Proof: client/src/components/CrimeAnalytics.jsx:55-61")
    add_bullet(lines, "- Crime type pie = count by type.")
    add_bullet(lines, "- Proof: client/src/components/CrimeAnalytics.jsx:63-69")
    add_bullet(lines, "- District ranking = top 10 districts by count.")
    add_bullet(lines, "- Proof: client/src/components/CrimeAnalytics.jsx:71-81")
    add_bullet(lines, "- Time trend line = count by date sorted ascending.")
    add_bullet(lines, "- Proof: client/src/components/CrimeAnalytics.jsx:83-94")
    add_bullet(lines, "3) Time-Based Analytics (components/TimeBasedAnalytics.jsx)")
    add_bullet(lines, "- Hourly graph = 24-bin array, incremented by extracted hour.")
    add_bullet(lines, "- Proof: client/src/components/TimeBasedAnalytics.jsx:32-42")
    add_bullet(lines, "- Weekly graph = day-of-week counts and peak hour per day.")
    add_bullet(lines, "- Proof: client/src/components/TimeBasedAnalytics.jsx:47-67")
    add_bullet(lines, "- Year trend percentage = ((secondHalf - firstHalf) / firstHalf) * 100.")
    add_bullet(lines, "- Proof: client/src/components/TimeBasedAnalytics.jsx:104-107")
    add_bullet(lines, "4) Officer Performance (components/OfficerPerformance.jsx)")
    add_bullet(lines, "- Clearance rate = solvedCases / assignedCases * 100.")
    add_bullet(lines, "- Proof: client/src/components/OfficerPerformance.jsx:81")
    add_bullet(lines, "- Overall solved percentage = solvedCases / totalCases * 100.")
    add_bullet(lines, "- Proof: client/src/components/OfficerPerformance.jsx:97")
    add_bullet(lines, "5) Crime Trend Predictions (components/CrimeTrendPredictions.jsx)")
    add_bullet(lines, "- Daily forecast formula uses 70% day-pattern + 30% recent average adjusted by trend factor.")
    add_bullet(lines, "- Proof: client/src/components/CrimeTrendPredictions.jsx:50")
    add_bullet(lines, "- Weekly forecast formula scales weekly average by bounded trend and horizon.")
    add_bullet(lines, "- Proof: client/src/components/CrimeTrendPredictions.jsx:70")
    add_bullet(lines, "- Displayed accuracy in that page is heuristic: avgConfidence - 6 (clamped), not confusion-matrix accuracy.")
    add_bullet(lines, "- Proof: client/src/components/CrimeTrendPredictions.jsx:125")
    add_bullet(lines, "6) Crime Map (components/CrimeMap.jsx)")
    add_bullet(lines, "- Crime cluster marker count groups identical lat,lng points.")
    add_bullet(lines, "- Proof: client/src/components/CrimeMap.jsx:457-466")
    add_bullet(lines, "- Marker radius is min(6 + count*2, 25), so denser points appear larger.")
    add_bullet(lines, "- Proof: client/src/components/CrimeMap.jsx:662")
    add_bullet(lines, "7) Real-Time Alerts (components/RealTimeCrimeAlerts.jsx)")
    add_bullet(lines, "- Average ETA = mean of numeric etaMinutes values.")
    add_bullet(lines, "- Proof: client/src/components/RealTimeCrimeAlerts.jsx:217-220")

    add_section(lines, "H) Frequently Asked Viva Questions with Simple Answers")
    viva = [
        ("Q1. Which algorithm is used for hotspot detection?", "KMeans clustering on latitude-longitude points."),
        ("Q2. Why KMeans?", "It is fast, stable, and gives clear cluster centers that can be directly shown on the map as hotspots."),
        ("Q3. How is number of clusters chosen?", "The code tries candidate k values and chooses the one with best silhouette score."),
        ("Q4. What is silhouette score in simple words?", "It shows how compact each cluster is and how far apart clusters are from each other."),
        ("Q5. What is inertia?", "It is the sum of squared distances from points to their assigned cluster center. Lower is better, but compare carefully."),
        ("Q6. Why can we not directly trust only dashboard accuracy text?", "The trend page accuracy is a heuristic display value, not confusion-matrix evaluation."),
        ("Q7. Then where is real Accuracy/Precision/Recall/F1?", "In evaluation output from temporal holdout script: server/evaluate_metrics_stdout.json."),
        ("Q8. What does Precision=100% mean now?", "When model predicted hotspot in evaluation, those predictions were correct in this dataset (FP=0)."),
        ("Q9. What does Recall=70.37% mean?", "Model found most, but not all, true hotspots. Some true hotspots were missed (FN=8)."),
        ("Q10. How to improve recall?", "Tune hotspot radius/threshold, add richer features (time/context), and compare DBSCAN/HDBSCAN."),
        ("Q11. What is improved prediction accuracy percentage?", "Against 50% balanced naive baseline, current 85.19% gives +35.19 points, +70.38% relative lift."),
        ("Q12. How was response-time reduction measured?", "By benchmarking naive point-scan vs centroid-scan on same query set and repeats."),
        ("Q13. What is current response-time reduction?", "98.09% lower average latency per prediction, about 52.43x speedup."),
        ("Q14. Why do we store coverage percent?", "It shows data quality for training: how many records had usable coordinates/geocodes."),
        ("Q15. Why are some records skipped?", "Records can be skipped if coordinates are invalid or geocoding fails."),
        ("Q16. What does incidents24h card mean in Police Dashboard?", "Count of incidents where timestamp difference from now is at most 24 hours."),
        ("Q17. How is incidents7d computed?", "Same logic, with 7-day window."),
        ("Q18. How is state bar chart computed?", "Count map by normalized state names."),
        ("Q19. How is district top-10 chart computed?", "Sort district counts descending and keep first 10."),
        ("Q20. How is crime trend line chart computed?", "Aggregate count per date then sort by date."),
        ("Q21. How is hourly graph computed?", "Create 24 bins and increment by parsed hour from crime time/date."),
        ("Q22. How is weekly pattern computed?", "Count by day-of-week and find each day's peak hour from hour histogram."),
        ("Q23. How is yearly trend percent computed?", "Compare total crimes in months 7-12 vs 1-6 using percentage change formula."),
        ("Q24. How is officer clearance rate computed?", "Solved cases divided by assigned cases multiplied by 100."),
        ("Q25. Why may Avg Response Time show N/A in some reports?", "Current dataset does not provide reliable start-end timestamps for all cases."),
        ("Q26. How is map cluster size shown?", "Grouped by same coordinates, and marker size grows with count."),
        ("Q27. How is hotspot circle radius decided?", "Radius scales with hotspot likelihood and user-selected slider bounds."),
        ("Q28. How often does dashboard refresh?", "Police dashboard refreshes every 20 seconds; several analytics pages refresh every 30 or 60 seconds."),
        ("Q29. Are these numbers reproducible?", "Yes. Re-run retrain_model.py, evaluate_hotspot_metrics.py, and benchmark_prediction_latency.py."),
        ("Q30. What is your one-line model summary?", "A KMeans-based geospatial hotspot model with validated quality metrics and measurable latency optimization."),
    ]

    for q, a in viva:
        add_bullet(lines, q)
        add_bullet(lines, f"Answer: {a}")

    add_section(lines, "I) Repro Commands (for proof in front of panel)")
    add_bullet(lines, "From server folder:")
    add_bullet(lines, "1) ..\\.venv\\Scripts\\python.exe retrain_model.py > retrain_stdout.json")
    add_bullet(lines, "2) ..\\.venv\\Scripts\\python.exe tools/evaluate_hotspot_metrics.py > evaluate_metrics_stdout.json")
    add_bullet(lines, "3) ..\\.venv\\Scripts\\python.exe tools/benchmark_prediction_latency.py > latency_benchmark_stdout.json")
    add_bullet(lines, "4) ..\\.venv\\Scripts\\python.exe tools/generate_complete_review_pdf.py")

    return lines


def write_pdf(lines, output_path):
    page_w, page_h = A4
    margin = 42
    y = page_h - margin

    c = canvas.Canvas(output_path, pagesize=A4)
    c.setTitle("Predictive Policing Complete Review Handbook")

    def new_page():
        nonlocal y
        c.showPage()
        y = page_h - margin

    for style, text in lines:
        if style == "title":
            c.setFont("Helvetica-Bold", 16)
            wrapped = textwrap.wrap(text, width=78) or [""]
            for line in wrapped:
                if y < margin + 24:
                    new_page()
                c.drawString(margin, y, line)
                y -= 21
            y -= 4
            continue

        if style == "heading":
            c.setFont("Helvetica-Bold", 12)
            wrapped = textwrap.wrap(text, width=96) or [""]
            for line in wrapped:
                if y < margin + 18:
                    new_page()
                c.drawString(margin, y, line)
                y -= 16
            y -= 1
            continue

        if style == "bullet":
            c.setFont("Helvetica", 10)
            wrapped = textwrap.wrap(text, width=103) or [""]
            for i, line in enumerate(wrapped):
                if y < margin + 14:
                    new_page()
                prefix = "- " if i == 0 else "  "
                c.drawString(margin, y, f"{prefix}{line}")
                y -= 13
            continue

        c.setFont("Helvetica", 10)
        wrapped = textwrap.wrap(text, width=105) if text else [""]
        for line in wrapped:
            if y < margin + 14:
                new_page()
            c.drawString(margin, y, line)
            y -= 13

    c.save()


def main():
    lines = build_lines()
    write_pdf(lines, OUTPUT_PDF)
    print(json.dumps({"status": "ok", "pdf": OUTPUT_PDF}))


if __name__ == "__main__":
    main()
