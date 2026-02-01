import os
import pandas as pd
import matplotlib.pyplot as plt


RESULTS_DIR = os.getenv("LOAD_TEST_RESULTS_DIR", "load_test_results")
CSV_PREFIX = os.getenv("LOAD_TEST_CSV_PREFIX", "load_test_results/locust")

STATS_CSV = f"{CSV_PREFIX}_stats.csv"
HISTORY_CSV = f"{CSV_PREFIX}_stats_history.csv"

os.makedirs(RESULTS_DIR, exist_ok=True)
charts_dir = os.path.join(RESULTS_DIR, "charts")
os.makedirs(charts_dir, exist_ok=True)


def save_chart(df, x_col, y_cols, title, filename, ylabel):
    plt.figure(figsize=(10, 4))
    for col in y_cols:
        if col not in df.columns:
            continue
        plt.plot(df[x_col], df[col], label=col)
    plt.title(title)
    plt.xlabel("timestamp")
    plt.ylabel(ylabel)
    plt.legend()
    plt.tight_layout()
    plt.savefig(os.path.join(charts_dir, filename))
    plt.close()


def main():
    if not os.path.exists(STATS_CSV) or not os.path.exists(HISTORY_CSV):
        raise SystemExit("CSV de resultados não encontrados. Rode o Locust antes de gerar o relatório.")

    stats = pd.read_csv(STATS_CSV)
    history = pd.read_csv(HISTORY_CSV)

    overall = stats[stats["Name"] == "Aggregated"].iloc[0]
    summary = {
        "requests": int(overall["Request Count"]),
        "failures": int(overall["Failure Count"]),
        "rps": float(overall["Requests/s"]),
        "avg_ms": float(overall["Average Response Time"]),
        "p50_ms": float(overall["Median Response Time"]),
        "p95_ms": float(overall["95%"]),
        "max_ms": float(overall["Max Response Time"]),
    }

    save_chart(
        history,
        "Timestamp",
        ["Requests/s", "Failures/s"],
        "Taxa de requisições e falhas",
        "requests_failures.png",
        "req/s",
    )
    save_chart(
        history,
        "Timestamp",
        ["Total Average Response Time", "Total Median Response Time", "95%"],
        "Latência (ms)",
        "latency.png",
        "ms",
    )
    save_chart(
        history,
        "Timestamp",
        ["User Count"],
        "Usuários ativos",
        "users.png",
        "users",
    )

    report_path = os.path.join(RESULTS_DIR, "report.md")
    with open(report_path, "w", encoding="utf-8") as f:
        f.write("# Relatório de Teste de Carga (Locust)\n\n")
        f.write("## Resumo\n")
        f.write(f"- Requisições: {summary['requests']}\n")
        f.write(f"- Falhas: {summary['failures']}\n")
        f.write(f"- RPS médio: {summary['rps']:.2f}\n")
        f.write(f"- Latência média (ms): {summary['avg_ms']:.2f}\n")
        f.write(f"- p50 (ms): {summary['p50_ms']:.2f}\n")
        f.write(f"- p95 (ms): {summary['p95_ms']:.2f}\n")
        f.write(f"- Máx (ms): {summary['max_ms']:.2f}\n\n")
        f.write("## Gráficos\n")
        f.write("- `charts/requests_failures.png`\n")
        f.write("- `charts/latency.png`\n")
        f.write("- `charts/users.png`\n")

    print(f"Relatório salvo em {report_path}")


if __name__ == "__main__":
    main()
