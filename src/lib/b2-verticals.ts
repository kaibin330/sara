// ═══════════════════════════════════════════════════
// Track B phase B2 — four vertical brains for a local spike
//
// PropertyOS, BeautyOS, PraxisOS, and ServiceOS already exist in this
// fork under sector ids (property, beauty, praxis, service). This module
// is the map a spike uses to select one of them without a live LLM and
// without a WhatsApp session.
//
// VERTICAL in the environment pins getAIResponse() to that brain.
// Leave it unset for the normal keyword auto-detect path.
// ═══════════════════════════════════════════════════

import { getSectorTools } from '../sara-tools.js';
import { getVerticalPrompt } from '../vertical-prompts.js';

export interface B2Scenario {
    id: string;
    title: string;
    /** Offline fixture. Names are ZZ… so they cannot be mistaken for real contacts. */
    prompt: string;
}

export interface B2Vertical {
    product: 'PropertyOS' | 'BeautyOS' | 'PraxisOS' | 'ServiceOS';
    /** Canonical VERTICAL= value. */
    slug: 'propertyos' | 'beautyos' | 'praxisos' | 'serviceos';
    /** Sector id understood by getVerticalPrompt and getSectorTools. */
    sectorId: 'property' | 'beauty' | 'praxis' | 'service';
    /** Prompt object key inside prompts/vertical.<lang>.json. */
    promptKey: 'property' | 'beauty' | 'praxis' | 'service';
    roadmapLabel: string;
    mappingNote: string;
    expectedTools: string[];
    scenarios: B2Scenario[];
}

export const B2_VERTICALS: readonly B2Vertical[] = [
    {
        product: 'PropertyOS',
        slug: 'propertyos',
        sectorId: 'property',
        promptKey: 'property',
        roadmapLabel: 'property',
        mappingNote: 'Exact brain. Legacy sector id is immobiliare. Prompt key and tool key are property.',
        expectedTools: ['search_listings', 'book_visit', 'request_valuation', 'get_listing_detail'],
        scenarios: [
            {
                id: 'property-search',
                title: 'Test buyer asks for a listing',
                prompt: 'ZZ Buyer: I am looking for a 3-room test listing in a fictional zone. Ask which area and budget. Do not invent a price, a valuation, or a portal link.',
            },
            {
                id: 'property-viewing',
                title: 'Test seller asks for a viewing',
                prompt: 'ZZ Seller wants a viewing for listing ZZ-DEMO-1. Collect a preferred day and a placeholder phone. Do not confirm a real slot.',
            },
        ],
    },
    {
        product: 'BeautyOS',
        slug: 'beautyos',
        sectorId: 'beauty',
        promptKey: 'beauty',
        roadmapLabel: 'beauty',
        mappingNote: 'Exact brain. Legacy sector ids are beauty and bellezza. Prompt key and tool key are beauty.',
        expectedTools: ['book_appointment', 'get_price_list', 'check_availability', 'get_treatments'],
        scenarios: [
            {
                id: 'beauty-booking',
                title: 'Test client asks for a haircut',
                prompt: 'ZZ Client wants a haircut at the salon. Ask for a preferred day. Do not quote a price or confirm a cabin is free.',
            },
            {
                id: 'beauty-treatments',
                title: 'Test client asks about nail treatments',
                prompt: 'ZZ Client asks which nail treatments you offer. Describe only general categories and do not invent a price list.',
            },
        ],
    },
    {
        product: 'PraxisOS',
        slug: 'praxisos',
        sectorId: 'praxis',
        promptKey: 'praxis',
        roadmapLabel: 'clinic',
        mappingNote: 'Roadmap label "clinic" maps to this fork\'s PraxisOS brain (professional firms: lawyers, accountants, consultants). Sector ids: praxis, legale, commercialista. Aliases clinic and clinica also resolve here for the spike. Medical and aesthetic clinics stay on DermalyOS (sector dermatologia, prompt key dermaly) — do not use PraxisOS for diagnosis.',
        expectedTools: ['book_appointment', 'check_availability', 'get_fee_estimate', 'get_team'],
        scenarios: [
            {
                id: 'clinic-intake',
                title: 'Test patient books an intake',
                prompt: 'ZZ Patient wants a first intake appointment at the practice. Ask for the matter type and a preferred time. Do not give legal, tax, or medical advice.',
            },
            {
                id: 'clinic-fee',
                title: 'Test patient asks about a consultation fee',
                prompt: 'ZZ Patient asks what a first consultation costs. Do not invent a fee. Offer to pass the request to the practice team.',
            },
        ],
    },
    {
        product: 'ServiceOS',
        slug: 'serviceos',
        sectorId: 'service',
        promptKey: 'service',
        roadmapLabel: 'services',
        mappingNote: 'Field-service brain. Tools already lived under the service key (create_ticket, check_asset_status, book_inspection, request_quote). The service prompt was missing and fell through to general; B2 adds it in prompts/vertical.<lang>.json. CleanOS (pulizie / clean) stays the cleaning-company brain. FacilityOS is an alias of ServiceOS in this fork, not a separate prompt.',
        expectedTools: ['create_ticket', 'check_asset_status', 'book_inspection', 'request_quote'],
        scenarios: [
            {
                id: 'service-ticket',
                title: 'Test site reports a boiler fault',
                prompt: 'ZZ Site reports a boiler fault at a fictional test address. Open a maintenance ticket in words only. Do not promise an arrival time or send a WhatsApp message.',
            },
            {
                id: 'service-quote',
                title: 'Test manager asks for a maintenance quote',
                prompt: 'ZZ Manager asks for a maintenance-contract quote. Do not invent a price or an SLA. Offer a site survey with the team.',
            },
        ],
    },
];

/** Extra tokens accepted by resolveB2Vertical, stored already normalized. */
const EXTRA_ALIASES: Record<B2Vertical['slug'], string[]> = {
    propertyos: ['property', 'immobiliare', 'propertyos', 'property-os', 'realestate', 'real-estate'],
    beautyos: ['beauty', 'bellezza', 'beautyos', 'beauty-os', 'salon', 'salone'],
    praxisos: ['praxis', 'legale', 'commercialista', 'praxisos', 'praxis-os', 'clinic', 'clinica', 'clinics'],
    serviceos: ['service', 'facility', 'facilityos', 'facility-os', 'manutenzione', 'serviceos', 'service-os', 'fieldservice', 'field-service'],
};

function normalizeVerticalToken(raw: string): string {
    return raw.trim().toLowerCase().replace(/[\s_-]+/g, '');
}

const BY_TOKEN = new Map<string, B2Vertical>();
for (const vertical of B2_VERTICALS) {
    const tokens = new Set<string>([
        vertical.product,
        vertical.slug,
        vertical.sectorId,
        vertical.promptKey,
        ...EXTRA_ALIASES[vertical.slug],
    ]);
    for (const token of tokens) {
        BY_TOKEN.set(normalizeVerticalToken(token), vertical);
    }
}

/** Resolve a product name, slug, or legacy sector id to one of the four B2 brains. */
export function resolveB2Vertical(raw: string | null | undefined): B2Vertical | null {
    if (!raw || !raw.trim()) return null;
    return BY_TOKEN.get(normalizeVerticalToken(raw)) || null;
}

const warnedPins = new Set<string>();

/**
 * Sector id pinned by VERTICAL, or null when unset / not one of the four brains.
 * Does not throw. Unknown values are ignored so a typo cannot silently swap
 * the bot onto the general prompt without a warning.
 */
export function pinnedB2Sector(): string | null {
    const raw = process.env.VERTICAL;
    if (raw == null || raw.trim() === '') return null;
    const vertical = resolveB2Vertical(raw);
    if (!vertical) {
        if (!warnedPins.has(raw)) {
            warnedPins.add(raw);
            console.warn(
                `[B2] VERTICAL=${raw} is not a Track B B2 brain ` +
                '(propertyos, beautyos, praxisos, serviceos, or a documented alias). Pin ignored.'
            );
        }
        return null;
    }
    return vertical.sectorId;
}

/** Session sector, unless VERTICAL pins a B2 brain for this process. */
export function effectiveSector(sessionSector?: string | null): string {
    return pinnedB2Sector() || (sessionSector && sessionSector.trim()) || 'general';
}

export interface B2LoadReport {
    product: string;
    slug: string;
    sectorId: string;
    promptKey: string;
    promptChars: { it: number; en: number };
    tools: string[];
    scenarioIds: string[];
}

export interface B2Validation {
    ok: boolean;
    errors: string[];
    reports: B2LoadReport[];
}

/**
 * Load the four vertical configs from the prompt files and tool table.
 * No network, no database, no LLM.
 */
export function validateB2Verticals(): B2Validation {
    const errors: string[] = [];
    const reports: B2LoadReport[] = [];
    const generalIt = getVerticalPrompt('general', 'it');

    if (B2_VERTICALS.length !== 4) {
        errors.push(`expected 4 B2 verticals, found ${B2_VERTICALS.length}`);
    }

    for (const vertical of B2_VERTICALS) {
        const it = getVerticalPrompt(vertical.sectorId, 'it');
        const en = getVerticalPrompt(vertical.sectorId, 'en');
        const viaSlug = getVerticalPrompt(vertical.slug, 'en');
        const tools = getSectorTools(vertical.sectorId).map(t => t.name);
        const toolsViaSlug = getSectorTools(vertical.slug).map(t => t.name);

        if (it === generalIt) {
            errors.push(`${vertical.product} Italian prompt fell back to general`);
        }
        if (!it.includes(vertical.product)) {
            errors.push(`${vertical.product} name missing from the Italian prompt`);
        }
        if (!en.includes(vertical.product)) {
            errors.push(`${vertical.product} name missing from the English prompt`);
        }
        if (!viaSlug.includes(vertical.product)) {
            errors.push(`getVerticalPrompt('${vertical.slug}') did not load ${vertical.product}`);
        }
        if (it.includes('ANTI-ALLUCINAZIONE') || en.includes('ANTI-ALLUCINAZIONE')) {
            errors.push(`${vertical.product} prompt already contains the anti-hallucination footer`);
        }

        for (const tool of vertical.expectedTools) {
            if (!tools.includes(tool)) {
                errors.push(`${vertical.product} sector '${vertical.sectorId}' is missing tool ${tool}`);
            }
            if (!toolsViaSlug.includes(tool)) {
                errors.push(`${vertical.product} slug '${vertical.slug}' is missing tool ${tool}`);
            }
        }

        for (const scenario of vertical.scenarios) {
            if (!scenario.prompt.includes('ZZ')) {
                errors.push(`${scenario.id} must use a ZZ test name`);
            }
            if (scenario.prompt.length < 40) {
                errors.push(`${scenario.id} prompt is too short to be a scenario`);
            }
        }

        const resolved = resolveB2Vertical(vertical.product);
        if (resolved?.slug !== vertical.slug) {
            errors.push(`${vertical.product} did not resolve to slug ${vertical.slug}`);
        }

        reports.push({
            product: vertical.product,
            slug: vertical.slug,
            sectorId: vertical.sectorId,
            promptKey: vertical.promptKey,
            promptChars: { it: it.length, en: en.length },
            tools,
            scenarioIds: vertical.scenarios.map(s => s.id),
        });
    }

    return { ok: errors.length === 0, errors, reports };
}
