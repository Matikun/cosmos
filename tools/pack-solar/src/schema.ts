import { z } from 'zod';

// ---------------------------------------------------------------------------
// Source data schema (degrees — degrees may exist ONLY here and in convert.ts)
// ---------------------------------------------------------------------------

export const JplTableEntrySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  _note: z.string().optional(),
  a: z.number().positive(),
  adot: z.number(),
  e: z.number().gte(0).lt(1),
  edot: z.number(),
  I: z.number(),
  Idot: z.number(),
  L: z.number(),
  Ldot: z.number(),
  long_peri: z.number(),
  long_peri_dot: z.number(),
  node: z.number(),
  node_dot: z.number(),
});

export const MoonEntrySchema = z
  .object({
    id: z.string(),
    name: z.string(),
    parentId: z.string(),
    aKm: z.number().positive(),
    e: z.number().gte(0).lt(1),
    iDeg: z.number(),
    radiusKm: z.number().positive(),
    slug: z.string().optional(),
    surfaceColorLinear: z.tuple([z.number(), z.number(), z.number()]).optional(),
  })
  .refine(
    (m) => m.slug !== undefined || m.surfaceColorLinear !== undefined,
    'Each moon must have either slug (texture) or surfaceColorLinear',
  );

export const PhysicalEntrySchema = z.object({
  id: z.string(),
  radiusKm: z.number().positive(),
  rotationPeriodH: z.number(),
  axialTiltDeg: z.number().gte(0).lte(180),
});

export const SaturnRingSchema = z.object({
  innerRadiusKm: z.number().positive(),
  outerRadiusKm: z.number().positive(),
});

export const SourceDataSchema = z.object({
  generatedAtIso: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
  jplTable1: z.array(JplTableEntrySchema).length(8),
  moonsTable: z.array(MoonEntrySchema).length(6),
  physicalTable: z.array(PhysicalEntrySchema).length(8),
  saturnRing: SaturnRingSchema,
  parentGm: z.record(z.string(), z.number().positive()),
});

export type SourceData = z.infer<typeof SourceDataSchema>;

// ---------------------------------------------------------------------------
// Output pack schema (radians — validates the emitted SystemsPackManifest)
// ---------------------------------------------------------------------------

const angleRad = () => z.number().gte(-Math.PI).lte(Math.PI);

export const KeplerElementsSchema = z.object({
  semiMajorAxisAu: z.number().positive(),
  eccentricity: z.number().gte(0).lt(1),
  inclinationRad: angleRad(),
  ascendingNodeLongitudeRad: angleRad(),
  argumentOfPeriapsisRad: angleRad(),
  meanAnomalyAtEpochRad: angleRad(),
  epochJD: z.number(),
  muKm3S2: z.number().positive(),
});

const TexturesSchema = z.object({
  albedoUrl: z.string().optional(),
  ringUrl: z.string().optional(),
});

export const PlanetRecordSchema = z.object({
  id: z.string(),
  kind: z.literal('planet'),
  name: z.string().optional(),
  parentId: z.string(),
  radiusKm: z.number().positive(),
  massKg: z.number().optional(),
  elements: KeplerElementsSchema.optional(),
  seed: z.number().optional(),
  rotationPeriodH: z.number().optional(),
  axialTiltRad: z.number().optional(),
  textures: TexturesSchema.optional(),
  ring: z
    .object({ innerRadiusKm: z.number().positive(), outerRadiusKm: z.number().positive() })
    .optional(),
  surfaceColorLinear: z.tuple([z.number(), z.number(), z.number()]).optional(),
  unlit: z.boolean().optional(),
});

export const StarRecordSchema = z.object({
  id: z.string(),
  kind: z.literal('star'),
  name: z.string().optional(),
  positionPc: z.tuple([z.number(), z.number(), z.number()]),
  absMag: z.number(),
  colorIndexBV: z.number(),
});

export const StarSystemRecordSchema = z.object({
  id: z.string(),
  name: z.string(),
  star: StarRecordSchema,
  bodies: z.array(PlanetRecordSchema),
});

export const SystemsPackManifestSchema = z.object({
  packFormatVersion: z.literal(1),
  source: z.string(),
  generatedAtIso: z.string(),
  systems: z.array(StarSystemRecordSchema),
});
