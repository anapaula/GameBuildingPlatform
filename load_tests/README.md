# Teste de carga (Locust)

## Como executar

1) Inicie o backend e banco:
```
docker-compose up -d
```

2) Rode o teste (exemplo 1000 usuários por 2 minutos):
```
python -m locust -f load_tests/locustfile.py --headless -u 1000 -r 100 --run-time 2m --csv load_test_results/locust --csv-full-history
```

3) Gere o relatório com gráficos:
```
python load_tests/generate_report.py
```

Os arquivos de saída ficam em `load_test_results/`.
