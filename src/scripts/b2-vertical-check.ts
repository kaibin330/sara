// Offline proof that the four Track B B2 verticals load.
// No LLM, no database, no WhatsApp.
//
//   npm run b2-check
//   npx tsx src/scripts/b2-vertical-check.ts

import { validateB2Verticals } from '../lib/b2-verticals.js';

const result = validateB2Verticals();

for (const report of result.reports) {
    console.log(
        `${report.product}  VERTICAL=${report.slug}  sector=${report.sectorId}  ` +
        `prompt.it=${report.promptChars.it}  prompt.en=${report.promptChars.en}  ` +
        `tools=${report.tools.join(',')}  scenarios=${report.scenarioIds.join(',')}`
    );
}

if (!result.ok) {
    console.error('B2 vertical check failed:');
    for (const error of result.errors) console.error(` - ${error}`);
    process.exit(1);
}

console.log('B2 vertical configs loaded (offline, no LLM, no WhatsApp).');
