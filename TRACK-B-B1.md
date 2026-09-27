# Track B — B1 foundation (local / dev spike)

Fork: [kaibin330/sara](https://github.com/kaibin330/sara), forked from [Alessandro114/sara](https://github.com/Alessandro114/sara).

Context: Gavin / BTB SOLUTIONS, 10X CRM spike. This repository stays its own fork. Keep it isolated from any proprietary 10X monorepo.

No real API keys are stored here. No WhatsApp number is connected. No outbound messages are sent.

## License — AGPL-3.0 (accepted for this spike)

Upstream SARA is [GNU AGPL-3.0](LICENSE). Gavin accepted that license for this spike.

Affero section 13 (Remote Network Interaction) says that if you modify the Program, your modified version must prominently offer all users interacting with it remotely through a computer network an opportunity to receive the Corresponding Source of your version, at no charge, from a network server.

Any future 10X SaaS embedding of a modified SARA has to account for that duty: network users of the modified program must be offered Corresponding Source. This spike does not grant a commercial license that removes AGPL obligations. Upstream’s README points commercial-licensing questions at ale@get-scala.com. Do not copy this tree into a closed 10X codebase as if the AGPL did not apply.

## Start (Docker Compose)

From the repository root:

```bash
cp .env.example .env
docker compose up -d --build
```

Leave the LLM key lines empty for a boot-only spike. `.env` is gitignored. Compose refuses to start if `.env` is missing, because `waha` and `sara` both use `env_file: .env` and the WAHA service interpolates `WAHA_API_KEY`.

`docker-compose.yml` starts three services:

| Service | Image | Host port |
|---|---|---|
| `postgres` | `pgvector/pgvector:pg15` (db `sara`, user/password `postgres`) | 5432 |
| `waha` | `devlikeapro/waha` | 3004 → container 3000 |
| `sara` | built from `Dockerfile` (Node 20, `node dist/index.js`) | 3006 |

Inside the Compose network these values override `.env` (the example file still says localhost, which is only correct outside Docker):

- `DATABASE_URL=postgresql://postgres:postgres@postgres:5432/sara`
- `WAHA_API_URL=http://waha:3000`
- `WAHA_WEBHOOK_URL=http://sara:3006/api/waha-webhook`

Stop the stack with `docker compose down`. Add `-v` only if you also want the Postgres volume removed.

### What a successful boot looks like

Verified from this repo with `.env` copied from `.env.example` and no provider keys filled in:

- `postgres` becomes healthy.
- `waha` listens on port 3004 (`GET /api/sessions` with `X-Api-Key` returns HTTP 200).
- `sara` becomes healthy. `GET http://localhost:3006/api/sara/health` returns HTTP 200.

Fresh schema body (HTTP 200):

```json
{
  "status": "degraded",
  "bot": "S.A.R.A.",
  "version": "2.2.0",
  "checks": {
    "crm_contacts": "missing_or_broken",
    "wa_messages": "ok",
    "sara_contact_profiles": "ok"
  }
}
```

`status: "degraded"` on a fresh database is expected. `crm_contacts` belongs to the SCALA backend, not to this bot (`scripts/staging-smoke.mjs` treats it as optional). `wa_messages` and `sara_contact_profiles` are created by `initDB()` and report `ok`. The Docker healthcheck treats HTTP 200 as success.

Logs also report CRM sync disabled until a SCALA `profiles` row exists, and embeddings skipped while no provider key is set. Neither of those stops the API.

## Environment variable names

Placeholders only. Do not commit `.env`. Do not invent provider keys.

| Name | Needed for |
|---|---|
| `DATABASE_URL` | Process startup. Compose overrides it to the `postgres` service. |
| `WAHA_API_KEY` | Shared secret for the `waha` and `sara` containers. Compose passes `${WAHA_API_KEY}` into WAHA. `.env.example` uses `change-this-to-a-random-string`. Replace that with any local random string before a real session. If it is empty, WAHA generates its own key on boot and SARA’s calls get 401. |
| `SARA_API_KEY` | Every route except `/api/sara/health` and `/api/sara/widget/*`. `.env.example` uses `change-this-to-a-secure-key`. The process exits if the value is exactly `sara-dev-key-change-in-production`. If the variable is unset, SARA generates an ephemeral key and admin routes (including QR) are not stably reachable. Send it as `x-sara-api-key` or `Authorization: Bearer …`. |
| `GROQ_API_KEY` | Chat replies. Empty is enough for the health check. The chain also accepts `CEREBRAS_API_KEY`, `SAMBANOVA_API_KEY`, and `MISTRAL_API_KEY`. The provider list ignores values of 10 characters or fewer. |

Names Compose sets or that have defaults (present in `.env.example`):

- `WAHA_API_URL` — code reads this name. The README configuration table says `WAHA_URL`, which the process does not read. Compose forces `http://waha:3000`.
- `WAHA_WEBHOOK_URL` — Compose forces `http://sara:3006/api/waha-webhook`.
- `WAHA_ENGINE` — default `GOWS`. Compose also sets `WHATSAPP_DEFAULT_ENGINE=GOWS` on the WAHA container.
- `SARA_API_PORT` — default `3006`.

Not required to boot, even though the README table lists some of them as required:

- `VERTICAL` is not read at startup.
- Embeddings use `OLLAMA_EMBED_MODEL` (default `mxbai-embed-large`, 1024d) and Mistral when `MISTRAL_API_KEY` is set. The process does not read `EMBED_MODEL` or `OLLAMA_BASE_URL`. Local Ollama, if used later, is `OLLAMA_URL`.

Leave these blank unless a later task asks for them: `SCALA_BACKEND_URL`, `SCALA_API_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ADMIN_CHAT_ID`, `SENTRY_DSN`, `TAVILY_API_KEY`.

## Health URL

```bash
curl -sS http://localhost:3006/api/sara/health
```

`GET /api/sara/health` — no API key. This is the URL in the README quickstart.

## QR connect path (later)

Do not scan a QR in this spike. Do not attach a phone number. Do not send messages.

When a later local experiment is explicitly in scope:

1. WAHA dashboard: `http://localhost:3004` (container port 3000). If `WAHA_DASHBOARD_USERNAME` and `WAHA_DASHBOARD_PASSWORD` are unset, current WAHA images generate them at boot and print them in the `waha` logs. Put local placeholders in `.env` if you need a stable dashboard login. Do not commit them.
2. SARA route: `GET http://localhost:3006/api/sara/qr` with header `x-sara-api-key: <SARA_API_KEY>`. Without the header the route returns 401. The README quickstart omits the header; `src/sara-api.ts` requires it.
3. On the default engine (`WA_ENGINE=waha`), that SARA page stays on “No QR code available”. Only the legacy `WA_ENGINE=wwebjs` adapter writes `globalThis.__SARA_LAST_QR`. The WAHA adapter writes `qr_code.png` inside the `sara` container and logs the dashboard URL. Use the WAHA dashboard for a later scan.

The default path is unofficial WhatsApp Web through WAHA (`devlikeapro/waha`, engine `GOWS`). That path must stay away from production client WhatsApp Business (WABA) numbers. Do not pair a client’s official WABA number, and do not use this fork to send client traffic.

## Spike result

No application code change was required for boot. `docker compose up -d --build` from a clean `.env.example` copy builds the `sara` image, starts Postgres, WAHA, and SARA, and the health URL returns HTTP 200 with the container healthcheck `healthy`.
