# Track B phase B2 — PropertyOS, BeautyOS, PraxisOS, ServiceOS

Local spike on this SARA fork. Switch one vertical brain and run the scripted checks below. Nothing here places a WhatsApp call or needs a paid API key.

## License and messaging warnings

This repository is **AGPL-3.0** (see `LICENSE`). Keep the fork isolated from proprietary 10X code. Running a modified SARA as a network service can trigger AGPL source-offer obligations. Gavin accepted that risk for this spike only. Do not copy these brains into a closed product without a compliance review.

WhatsApp in this repo goes through **WAHA** and `whatsapp-web.js`. That path is **unofficial**. It is not the WhatsApp Business API. **Do not connect real WhatsApp numbers** for B2. Do not send outbound messages. Leave `WAHA_API_KEY`, `GROQ_API_KEY`, and the other provider keys as local placeholders (empty or `change-this-to-a-random-string` as in `.env.example`). The proof script does not read them.

Scenario contacts are test names only (`ZZ Buyer`, `ZZ Client`, `ZZ Patient`, `ZZ Site`, `ZZ Manager`, `ZZ Seller`). Do not replace them with real people.

## How verticals are defined here

Two layers, both keyed by a sector id:

| Layer | Where | What it does |
|---|---|---|
| Vertical brain prompt | `src/prompts/vertical.<lang>.json`, loaded by `getVerticalPrompt()` in `src/vertical-prompts.ts` | Persona, boundaries, escalation. Languages: `it`, `en`, `es`, `pt`. |
| Tools | `SARA_TOOLS` / `getSectorTools()` in `src/sara-tools.ts` | Function-calling actions for that brain. |
| Keyword auto-detect | `detectSector()` in `src/sectors.ts` | Picks a legacy sector id from the message when `VERTICAL` is unset. |
| Optional pin | `VERTICAL` env, applied in `getAIResponse()` via `effectiveSector()` | Forces one of the four B2 brains for the process. |

`README` lists `VERTICAL` as the active slug. Before this change the variable was unused. It now pins the four brains below. Any other value is ignored (with a warning) and auto-detect stays on.

## Map the four brains

Roadmap names and the ids in this fork:

| Roadmap | `VERTICAL=` | Sector id | Prompt key | Closest legacy ids | Tools |
|---|---|---|---|---|---|
| PropertyOS | `propertyos` | `property` | `property` | `immobiliare` | `search_listings`, `book_visit`, `request_valuation`, `get_listing_detail` |
| BeautyOS | `beautyos` | `beauty` | `beauty` | `beauty`, `bellezza` | `book_appointment`, `get_price_list`, `check_availability`, `get_treatments` |
| PraxisOS (clinic scenarios) | `praxisos` | `praxis` | `praxis` | `legale`, `commercialista`, `clinic`, `clinica` | `book_appointment`, `check_availability`, `get_fee_estimate`, `get_team` |
| ServiceOS | `serviceos` | `service` | `service` | `facility`, `facilityos`, `manutenzione` | `create_ticket`, `check_asset_status`, `book_inspection`, `request_quote` |

Notes:

- **PropertyOS** and **BeautyOS** match the product names already in the prompts.
- **PraxisOS** in this fork is the professional-firm brain (law, accounting, consulting), which is what `prompts/vertical.*.json` and `scala-knowledge.ts` describe. The roadmap's clinic scenarios are mapped onto that brain: intake booking and fee questions, with no legal, tax, or medical advice. `VERTICAL=clinic` and `VERTICAL=clinica` resolve to PraxisOS for this spike. **Medical and aesthetic clinics stay on DermalyOS** (`dermatologia` / prompt key `dermaly`). Do not send diagnosis traffic to PraxisOS.
- **ServiceOS** already had tools. It had no prompt, so `getVerticalPrompt('service')` used to fall through to `general`. B2 adds the `service` prompt in all four language files. **CleanOS** (`pulizie` / `clean`) remains the cleaning-company brain. **FacilityOS** is an alias of ServiceOS here, not a fifth prompt.
- Saying `PropertyOS`, `BeautyOS`, `PraxisOS`, or `ServiceOS` in a message also hits `detectSector()` (`immobiliare`, `beauty`, `legale`, `service`). Those legacy ids still map onto the same brains when `VERTICAL` is unset.

## Set each vertical

Unset `VERTICAL` (or leave it blank) for keyword auto-detect.

Pin one brain for every `getAIResponse()` call in the process:

```bash
# PropertyOS
VERTICAL=propertyos

# BeautyOS
VERTICAL=beautyos

# PraxisOS — clinic scenarios in this spike
VERTICAL=praxisos

# ServiceOS
VERTICAL=serviceos
```

Aliases that resolve to the same brain: `immobiliare`, `property`, `beauty`, `bellezza`, `clinic`, `clinica`, `legale`, `commercialista`, `praxis`, `service`, `facility`, `facilityos`, `field-service`. Hyphens and spaces are ignored (`property-os`, `PropertyOS`).

A pinned value wins over the session sector and over keyword detection, so a spike stays on the brain you chose. Restart the process after changing it.

Without the pin, a session sector of `immobiliare`, `beauty`, `legale` / `praxis`, or `service` selects the same brain. No database seed is required for the proof below.

## Example scenario prompts

Paste these into a local session only after `VERTICAL` is set. They are fixtures, not live sends. The assistant must not invent prices, slots, or arrival times, and must not message a real number.

### Property (`VERTICAL=propertyos`)

ZZ Buyer: I am looking for a 3-room test listing in a fictional zone. Ask which area and budget. Do not invent a price, a valuation, or a portal link.

ZZ Seller wants a viewing for listing ZZ-DEMO-1. Collect a preferred day and a placeholder phone. Do not confirm a real slot.

### Beauty (`VERTICAL=beautyos`)

ZZ Client wants a haircut at the salon. Ask for a preferred day. Do not quote a price or confirm a cabin is free.

ZZ Client asks which nail treatments you offer. Describe only general categories and do not invent a price list.

### Clinic (`VERTICAL=praxisos`)

ZZ Patient wants a first intake appointment at the practice. Ask for the matter type and a preferred time. Do not give legal, tax, or medical advice.

ZZ Patient asks what a first consultation costs. Do not invent a fee. Offer to pass the request to the practice team.

### Services (`VERTICAL=serviceos`)

ZZ Site reports a boiler fault at a fictional test address. Open a maintenance ticket in words only. Do not promise an arrival time or send a WhatsApp message.

ZZ Manager asks for a maintenance-contract quote. Do not invent a price or an SLA. Offer a site survey with the team.

Running those prompts through a live model is optional and needs your own provider key in `.env`. B2 does not supply one.

## Run the proof

The check reads the prompt JSON and the tool table. It does not open a database, call an LLM, or touch WhatsApp.

```bash
npm run b2-check
# same check:
npx tsx src/scripts/b2-vertical-check.ts
```

Fixture test (also runs under `npm test`):

```bash
npx tsx src/__tests__/b2-verticals.test.ts
```

A passing run prints one line per brain (`PropertyOS`, `BeautyOS`, `PraxisOS`, `ServiceOS`) with the sector id, prompt sizes, tool names, and scenario ids, then `B2 vertical configs loaded`.
