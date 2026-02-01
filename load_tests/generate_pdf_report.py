from pathlib import Path
from typing import Dict

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image
from PIL import Image as PILImage


ROOT = Path(__file__).resolve().parents[1]
REPORT_MD = ROOT / "load_test_results" / "report.md"
OUT_PDF = ROOT / "load_test_results" / "report.pdf"
CHARTS = [
    ROOT / "load_test_results" / "charts" / "requests_failures.png",
    ROOT / "load_test_results" / "charts" / "latency.png",
    ROOT / "load_test_results" / "charts" / "users.png",
]


def _parse_metrics(markdown_text: str) -> Dict[str, str]:
    metrics = {}
    for line in markdown_text.splitlines():
        line = line.strip()
        if not line.startswith("- "):
            continue
        if ":" not in line:
            continue
        key, value = line[2:].split(":", 1)
        metrics[key.strip()] = value.strip()
    return metrics


def _scaled_image(path: Path, max_width: float):
    with PILImage.open(path) as img:
        width, height = img.size
    scale = max_width / float(width)
    return Image(str(path), width=max_width, height=height * scale)


def main() -> None:
    if not REPORT_MD.exists():
        raise FileNotFoundError(f"Relatório não encontrado: {REPORT_MD}")

    report_text = REPORT_MD.read_text(encoding="utf-8")
    metrics = _parse_metrics(report_text)

    styles = getSampleStyleSheet()
    title_style = styles["Title"]
    body_style = styles["BodyText"]
    heading_style = styles["Heading2"]

    doc = SimpleDocTemplate(
        str(OUT_PDF),
        pagesize=A4,
        leftMargin=40,
        rightMargin=40,
        topMargin=40,
        bottomMargin=40,
        title="Resumo Executivo - Teste de Estabilidade (10 min)",
    )

    story = []
    story.append(Paragraph("Resumo Executivo — Teste de Estabilidade (10 min)", title_style))
    story.append(Spacer(1, 12))

    story.append(Paragraph("Objetivo: validar estabilidade com 1000 usuários simultâneos.", body_style))
    story.append(Spacer(1, 8))

    story.append(Paragraph("Indicadores principais", heading_style))
    story.append(Spacer(1, 6))

    for label in [
        "Requisições",
        "Falhas",
        "RPS médio",
        "Latência média (ms)",
        "p50 (ms)",
        "p95 (ms)",
        "Máx (ms)",
    ]:
        value = metrics.get(label, "N/A")
        story.append(Paragraph(f"• {label}: {value}", body_style))

    story.append(Spacer(1, 12))
    story.append(Paragraph("Gráficos", heading_style))
    story.append(Spacer(1, 6))

    max_width = A4[0] - 80
    for chart in CHARTS:
        if chart.exists():
            story.append(_scaled_image(chart, max_width))
            story.append(Spacer(1, 12))

    doc.build(story)


if __name__ == "__main__":
    main()
