// Track B B2 — four vertical brains load with no LLM and no WhatsApp.
// Run: npx tsx src/__tests__/b2-verticals.test.ts
// Also picked up by npm test.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    B2_VERTICALS,
    effectiveSector,
    pinnedB2Sector,
    resolveB2Vertical,
    validateB2Verticals,
} from '../lib/b2-verticals.js';
import { getSectorTools } from '../sara-tools.js';
import { getVerticalPrompt } from '../vertical-prompts.js';

const DOC = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), '../../TRACK-B-B2.md'),
    'utf8'
);

function testFourConfigsLoad(): void {
    const result = validateB2Verticals();
    assert.equal(result.ok, true, result.errors.join('\n'));
    assert.equal(result.reports.length, 4);
    const products = result.reports.map(r => r.product).sort();
    assert.deepEqual(products, ['BeautyOS', 'PraxisOS', 'PropertyOS', 'ServiceOS']);
    console.log('✅ testFourConfigsLoad: 4 vertical configs');
}

function testAliasesAndClinicMap(): void {
    assert.equal(resolveB2Vertical('PropertyOS')?.sectorId, 'property');
    assert.equal(resolveB2Vertical('immobiliare')?.slug, 'propertyos');
    assert.equal(resolveB2Vertical('beauty-os')?.slug, 'beautyos');
    assert.equal(resolveB2Vertical('bellezza')?.promptKey, 'beauty');
    assert.equal(resolveB2Vertical('clinic')?.product, 'PraxisOS');
    assert.equal(resolveB2Vertical('clinica')?.sectorId, 'praxis');
    assert.equal(resolveB2Vertical('facility')?.product, 'ServiceOS');
    assert.equal(resolveB2Vertical('field-service')?.slug, 'serviceos');
    assert.equal(resolveB2Vertical('dineos'), null);
    assert.equal(resolveB2Vertical(''), null);

    // ServiceOS must not collapse onto the general prompt.
    const service = getVerticalPrompt('service', 'en');
    assert.ok(service.includes('ServiceOS'));
    assert.notEqual(service, getVerticalPrompt('general', 'en'));
    assert.ok(getSectorTools('serviceos').some(t => t.name === 'create_ticket'));
    assert.ok(getSectorTools('clinic').some(t => t.name === 'get_fee_estimate'));
    console.log('✅ testAliasesAndClinicMap');
}

function testVerticalPin(): void {
    const previous = process.env.VERTICAL;
    try {
        delete process.env.VERTICAL;
        assert.equal(pinnedB2Sector(), null);
        assert.equal(effectiveSector('beauty'), 'beauty');
        assert.equal(effectiveSector(null), 'general');
        assert.equal(effectiveSector('   '), 'general');

        process.env.VERTICAL = 'PropertyOS';
        assert.equal(pinnedB2Sector(), 'property');
        assert.equal(effectiveSector('general'), 'property');
        assert.equal(effectiveSector('beauty'), 'property');

        process.env.VERTICAL = 'clinic';
        assert.equal(effectiveSector('general'), 'praxis');

        process.env.VERTICAL = 'not-a-vertical';
        assert.equal(pinnedB2Sector(), null);
        assert.equal(effectiveSector('beauty'), 'beauty');
    } finally {
        if (previous === undefined) delete process.env.VERTICAL;
        else process.env.VERTICAL = previous;
    }
    console.log('✅ testVerticalPin');
}

function testDocCoversScenariosAndWarnings(): void {
    for (const vertical of B2_VERTICALS) {
        assert.ok(DOC.includes(`VERTICAL=${vertical.slug}`), `doc missing VERTICAL=${vertical.slug}`);
        assert.ok(DOC.includes(vertical.product));
        for (const scenario of vertical.scenarios) {
            assert.ok(DOC.includes(scenario.prompt), `doc missing scenario ${scenario.id}`);
        }
    }
    assert.match(DOC, /AGPL-3\.0/);
    assert.match(DOC, /unofficial/i);
    assert.match(DOC, /real WhatsApp/i);
    assert.match(DOC, /npx tsx src\/scripts\/b2-vertical-check\.ts/);
    assert.match(DOC, /npm run b2-check/);
    console.log('✅ testDocCoversScenariosAndWarnings');
}

const previousVertical = process.env.VERTICAL;
delete process.env.VERTICAL;
try {
    testFourConfigsLoad();
    testAliasesAndClinicMap();
    testVerticalPin();
    testDocCoversScenariosAndWarnings();
    console.log('\n🎉 b2 vertical tests passed');
} catch (err: any) {
    console.error('\n❌ b2 vertical test failed:', err?.message || err);
    process.exitCode = 1;
} finally {
    if (previousVertical === undefined) delete process.env.VERTICAL;
    else process.env.VERTICAL = previousVertical;
}
