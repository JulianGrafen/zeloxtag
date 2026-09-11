# OWASP ZAP

## CI

Pull requests to `main` run a **baseline** scan via [`.github/workflows/owasp-zap.yml`](../.github/workflows/owasp-zap.yml). Reports are uploaded as workflow artifacts (`zap-baseline-report.html` / `.json`).

## Local scan

1. Build and start the app on port 3000:

   ```bash
   npm run build
   npm run start -- --port 3000
   ```

2. In another terminal:

   ```bash
   npm run security:zap
   ```

   Reports land in `.zap/reports/` (gitignored).

Override target URL:

```bash
ZAP_TARGET=http://127.0.0.1:3000 npm run security:zap
```

On Linux without `host.docker.internal`, use `ZAP_TARGET=http://172.17.0.1:3000` or the host IP.

## Tuning

- Add `.zap/rules.tsv` to ignore known false positives (ZAP context file format).
- For authenticated scans, use ZAP automation / full scan in a follow-up — baseline is unauthenticated only.
