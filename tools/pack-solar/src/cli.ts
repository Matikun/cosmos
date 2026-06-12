import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import { buildPack } from './convert.js';
import { SourceDataSchema, SystemsPackManifestSchema } from './schema.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const rawArgs = process.argv.slice(2);
const { values } = parseArgs({
  args: rawArgs[0] === '--' ? rawArgs.slice(1) : rawArgs,
  options: {
    out: { type: 'string' },
  },
});

if (!values.out) {
  // Turbo's build pipeline runs without arguments — skip gracefully.
  // To actually build the pack run:
  //   pnpm --filter @cosmos/pack-solar build -- --out apps/web/public
  if (values.out !== undefined) {
    console.error('Usage: tsx src/cli.ts --out <dir>');
    process.exit(1);
  }
  process.exit(0);
}

// pnpm changes CWD to the package dir; INIT_CWD is the directory from which
// the user invoked pnpm (the workspace root), so --out paths match expectations.
const baseCwd = process.env['INIT_CWD'] ?? process.cwd();
const outDir = resolve(baseCwd, values.out);
const dataPath = join(__dirname, '../data/solar-system.json');

const raw = JSON.parse(readFileSync(dataPath, 'utf-8')) as unknown;
const source = SourceDataSchema.parse(raw);

const pack = buildPack(source);
SystemsPackManifestSchema.parse(pack);

const packDir = join(outDir, 'packs');
const packPath = join(packDir, 'systems-sol.json');
mkdirSync(packDir, { recursive: true });
writeFileSync(packPath, JSON.stringify(pack, null, 2) + '\n');
console.log(`Pack written : ${packPath}`);

// Verify every textures.*Url referenced in the pack resolves to an existing file.
let missingTextures = 0;
for (const system of pack.systems) {
  for (const body of system.bodies) {
    if (body.textures === undefined) continue;
    const { albedoUrl, ringUrl } = body.textures;
    for (const url of [albedoUrl, ringUrl]) {
      if (url === undefined) continue;
      const texturePath = join(packDir, url);
      if (!existsSync(texturePath)) {
        console.error(`Missing texture: ${texturePath}  (${body.id})`);
        missingTextures++;
      }
    }
  }
}

if (missingTextures > 0) {
  console.error(`\n${missingTextures} texture(s) missing — see README for download instructions.`);
  process.exit(1);
}

console.log('All textures verified.');
