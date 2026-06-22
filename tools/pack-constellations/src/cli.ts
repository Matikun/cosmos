import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { assertAttribution, buildPack, parseSource } from './convert.js';
import { ConstellationPackSchema } from './schema.js';

const rawArgs = process.argv.slice(2);
const { values } = parseArgs({
  args: rawArgs[0] === '--' ? rawArgs.slice(1) : rawArgs,
  options: {
    input: { type: 'string' },
    out: { type: 'string' },
    attributions: { type: 'string' },
  },
});

// Resolve the repo root from this file's location rather than INIT_CWD: when
// turbo invokes `pnpm run build`, pnpm's cwd (and INIT_CWD) is already the
// package dir, not the workspace root.
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

const inputPath = resolve(repoRoot, values.input ?? 'tools/pack-constellations/src/constellation-lines.dat');
const outDir = resolve(repoRoot, values.out ?? 'apps/web/public/packs');
const attributionsPath = resolve(repoRoot, values.attributions ?? 'ATTRIBUTIONS.md');

assertAttribution(attributionsPath);

const sourceText = readFileSync(inputPath, 'utf-8');
const constellations = parseSource(sourceText);
const pack = buildPack(constellations);
ConstellationPackSchema.parse(pack);

const packPath = join(outDir, 'constellations.json');
mkdirSync(outDir, { recursive: true });
writeFileSync(packPath, JSON.stringify(pack, null, 2) + '\n');

const segmentCount = pack.constellations.reduce((n, c) => n + c.hipPairs.length / 2, 0);
console.log(`Pack written : ${packPath}`);
console.log(`Constellations: ${pack.constellations.length}, Segments: ${segmentCount}`);
