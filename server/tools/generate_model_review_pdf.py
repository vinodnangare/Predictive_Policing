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
OUTPUT_PDF = os.path.join(BASE_DIR, "Model_Review_Report.pdf")


def load_json(path):
    if not os.path.exists(path):
        return {}
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def fnum(value, digits=4):
    try:
        return f"{float(value):.{digits}f}"
    except Exception:
        return "N/A"


def build_content():
    retrain = load_json(RETRAIN_JSON)
    evaluation = load_json(EVAL_JSON)

    train_metrics = retrain.get("metrics", {})
    clf_metrics = evaluation.get("classificationMetrics", {})
    confusion = evaluation.get("confusionMatrix", {})
    summary = evaluation.get("summary", {})
    eval_model = evaluation.get("model", {})

    tp = int(confusion.get("TP", 0))
    tn = int(confusion.get("TN", 0))
    fp = int(confusion.get("FP", 0))
    fn = int(confusion.get("FN", 0))

    total = tp + tn + fp + fn

    lines = [
        ("title", "Predictive Policing Model Review Report"),
        ("text", f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"),
        ("text", ""),
        ("heading", "1) Model Used"),
        ("text", "Algorithm: KMeans clustering on crime latitude/longitude coordinates."),
        ("text", "K selection: silhouette-score-based search over candidate k values."),
        ("text", "Why KMeans: fast training, interpretable centroids, map-friendly hotspot centers."),
        ("text", ""),
        ("heading", "2) Native Training Metrics (from retrain pipeline)"),
        ("text", f"Records fetched: {train_metrics.get('recordsFetched', 'N/A')}"),
        ("text", f"Records used: {train_metrics.get('recordsUsed', 'N/A')}"),
        ("text", f"Records skipped: {train_metrics.get('recordsSkipped', 'N/A')}"),
        ("text", f"Coverage percent: {train_metrics.get('coveragePercent', 'N/A')}%"),
        ("text", f"Cluster count: {train_metrics.get('clusterCount', 'N/A')}"),
        ("text", f"Silhouette score: {train_metrics.get('silhouetteScore', 'N/A')}"),
        ("text", f"Model inertia: {train_metrics.get('modelInertia', 'N/A')}"),
        ("text", f"Avg cluster spread (km): {train_metrics.get('avgClusterSpreadKm', 'N/A')}"),
        ("text", f"Cluster sizes: {train_metrics.get('clusterSizes', 'N/A')}"),
        ("text", ""),
        ("heading", "3) Classification-Style Backtest Metrics"),
        ("text", "Note: KMeans is unsupervised. Accuracy/Precision/Recall/F1 are computed via temporal holdout + spatial hotspot hit-test protocol."),
        ("text", f"Train size: {summary.get('trainSize', 'N/A')}, Test size: {summary.get('testSize', 'N/A')}, Negative samples: {summary.get('negativeSamples', 'N/A')}"),
        ("text", f"Selected clusters in evaluation: {eval_model.get('selectedClusterCount', 'N/A')}"),
        ("text", f"Confusion matrix: TP={tp}, TN={tn}, FP={fp}, FN={fn}"),
        ("text", f"Accuracy: {clf_metrics.get('accuracy', 'N/A')}"),
        ("text", f"Precision: {clf_metrics.get('precision', 'N/A')}"),
        ("text", f"Recall: {clf_metrics.get('recall', 'N/A')}"),
        ("text", f"F1-score: {clf_metrics.get('f1Score', 'N/A')}"),
        ("text", ""),
        ("heading", "4) Formula Proof"),
        ("text", f"Accuracy = (TP + TN) / (TP + TN + FP + FN) = ({tp} + {tn}) / {total} = {fnum((tp + tn) / total if total else 0.0)}"),
        ("text", f"Precision = TP / (TP + FP) = {tp} / ({tp} + {fp}) = {fnum(tp / (tp + fp) if (tp + fp) else 0.0)}"),
        ("text", f"Recall = TP / (TP + FN) = {tp} / ({tp} + {fn}) = {fnum(tp / (tp + fn) if (tp + fn) else 0.0)}"),
        ("text", f"F1 = 2 * Precision * Recall / (Precision + Recall) = {fnum((2 * (tp / (tp + fp) if (tp + fp) else 0.0) * (tp / (tp + fn) if (tp + fn) else 0.0)) / (((tp / (tp + fp) if (tp + fp) else 0.0) + (tp / (tp + fn) if (tp + fn) else 0.0)) or 1e-12))}"),
        ("text", ""),
        ("heading", "5) Common Viva Questions and Answers"),
        ("text", "Q: Which clustering algorithm is used?"),
        ("text", "A: KMeans clustering with silhouette-based cluster count selection."),
        ("text", "Q: Why not show only accuracy from training?"),
        ("text", "A: KMeans is unsupervised and does not output native class labels for standard supervised accuracy."),
        ("text", "Q: Then how did you compute Precision/Recall/F1?"),
        ("text", "A: Temporal holdout backtest with hotspot hit-testing and explicit TP/TN/FP/FN."),
        ("text", "Q: What is model strength now?"),
        ("text", "A: Very high precision (few false alerts in this protocol)."),
        ("text", "Q: What needs improvement?"),
        ("text", "A: Recall can be improved by hotspot radius tuning and trying DBSCAN/HDBSCAN comparison."),
        ("text", ""),
        ("heading", "6) Evidence Files"),
        ("text", "server/retrain_stdout.json"),
        ("text", "server/evaluate_metrics_stdout.json"),
        ("text", "server/retrain_model.py"),
        ("text", "server/tools/evaluate_hotspot_metrics.py"),
    ]

    return lines


def write_pdf(lines, output_path):
    page_width, page_height = A4
    margin = 42
    y = page_height - margin

    c = canvas.Canvas(output_path, pagesize=A4)
    c.setTitle("Predictive Policing Model Review")

    def new_page():
        nonlocal y
        c.showPage()
        y = page_height - margin

    for style, text in lines:
        if style == "title":
            c.setFont("Helvetica-Bold", 16)
            wrapped = textwrap.wrap(text, width=70) or [""]
            for line in wrapped:
                if y < margin + 20:
                    new_page()
                c.drawString(margin, y, line)
                y -= 20
            y -= 4
            continue

        if style == "heading":
            c.setFont("Helvetica-Bold", 12)
            wrapped = textwrap.wrap(text, width=95) or [""]
            for line in wrapped:
                if y < margin + 18:
                    new_page()
                c.drawString(margin, y, line)
                y -= 16
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
    lines = build_content()
    write_pdf(lines, OUTPUT_PDF)
    print(json.dumps({"pdf": OUTPUT_PDF, "status": "ok"}))


if __name__ == "__main__":
    main()
