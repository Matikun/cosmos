# Research — jitter al acercarse a una estrella dentro de la galaxia

> Síntoma reportado: «cuando nos acercamos dentro de una galaxia a una estrella
> muy cerca tiene jitter, empieza a saltar para todos lados».

## TL;DR

El jitter **no** es un fallo del origen flotante f64 (ese path es correcto y está
probado). Es una **cancelación catastrófica en f32 hecha en la GPU**: el vertex
shader de estrellas suma `position + uRenderOffset` en precisión simple, donde
ambos sumandos pueden valer **decenas de parsecs** (hasta ±32 pc, el tamaño de la
hoja más profunda del octree). El ULP de f32 a esa magnitud es **~0.4–0.8 UA**, y
como `uRenderOffset` se recalcula cada frame al mover la cámara, el resultado
redondeado salta entre cubos de f32 frame a frame → la estrella «salta para todos
lados» cuando estás a pocas UA de ella.

Solo ocurre con estrellas del **catálogo Gaia/HYG sin sistema asociado**: esas
nunca disparan el cambio de contexto a `system` (unidades UA), así que se siguen
renderizando como sprites del octree en unidades de parsec.

**Fix recomendado (quirúrgico):** pasar `uRenderOffset` como par hi/lo f32
(emulated-double / render-to-eye) y que el shader haga `(position + offHi) + offLo`.
Por el lema de Sterbenz la resta cercana es exacta en f32 y la parte baja refina
el offset → jitter eliminado, sin re-empaquetar las posiciones.

---

## 1. La arquitectura de precisión (lo que SÍ funciona)

El proyecto usa origen flotante con rebasing en f64 (`@cosmos/coords`,
ADR-001):

- `packages/coords/src/frame-tree.ts` — conversiones f64 entre contextos.
- `packages/coords/src/origin.ts` — `toRenderSpace(pos, out)` calcula
  `render = bodyLocal − cameraLocal` **en f64**, y solo el llamador hace el
  downcast a f32.

Unidades por contexto (`packages/core-types/src/coords.ts`):

| contexto | 1 unidad | rebase threshold |
|----------|----------|------------------|
| universe | 1 Mpc (3.0857e22 m) | 10 000 u |
| galaxy   | **1 pc** (3.0857e16 m) | 10 000 u |
| system   | 1 UA (1.496e11 m) | 10 000 u |
| planet   | 1 km | 10 000 u |

Para objetos **individuales** (planetas, nebulosas, marcadores), cada frame se
hace `origin.toRenderSpace(pos)` por objeto → la posición cámara-relativa es
pequeña y el `fround` final es preciso. Esto es lo que valida `JitterProbe.tsx`
(`?debug=jitter`): cámara orbitando un marcador a 1 UA a 8 kpc del centro,
desviación máx < 0.5 px. **Ese gate pasa y seguirá pasando — no cubre este bug**
(ver §5).

## 2. El path de estrellas es distinto (la GPU hace la resta en f32)

Las estrellas del campo se dibujan en **un solo draw call por tile** del octree
(`packages/render-stars/src/star-points.ts`). No hay un `toRenderSpace` por
estrella; hay:

- Un atributo `position` (f32) = posición **tile-local en parsecs**, relativa al
  centro del tile. Se codifica como `s.x − center[x]` en
  `tools/pack-octree/src/encode.ts:46` y se guarda en un `Float32Array`.
- Un uniform `uRenderOffset` (f32, `THREE.Vector3`) = el centro del tile en
  coordenadas cámara-relativas, alimentado cada frame por
  `origin.toRenderSpace(originPc)` (`apps/web/src/scene/GalaxyScene.tsx:487-501`).

El vertex shader (`packages/render-stars/src/shaders/stars.vert.glsl.ts:22`):

```glsl
vec3 viewPos = mat3(viewMatrix) * (position + uRenderOffset);
```

`position + uRenderOffset` se evalúa **en f32 en la GPU**. La posición
cámara-relativa real de la estrella es la diferencia (casi cancelación) de dos
números f32 que, cerca de la estrella, valen ambos ~lo mismo en magnitud de tile.

## 3. La magnitud — por qué salta ~0.4–0.8 UA

El octree Gaia (`apps/web/public/packs/octree-gaia/octree.json`):

- `rootHalfExtentUnits: 65536` pc.
- Profundidad real medida: hasta **nivel 11**, hoja más profunda
  `halfExtentUnits = 32` pc (1267 tiles, 1093 hojas).

⇒ `position` (tile-local) puede valer hasta **±32 pc** en f32. El ULP de f32 a
esa magnitud:

| magnitud de `position` | ULP en f32 | en metros | en UA |
|------------------------|------------|-----------|-------|
| 32 pc (borde de hoja)  | 3.8e-6 pc  | 1.18e11 m | **0.79 UA** |
| 16 pc                  | 1.9e-6 pc  | 5.9e10 m  | **0.39 UA** |
| 1 pc                   | 1.2e-7 pc  | 3.7e6 m   | 0.025 UA |

Cuando estás *dentro* del tile, junto a la estrella, `uRenderOffset ≈ −position`
(misma magnitud, signo opuesto). La suma f32 redondea a pasos de ~ULP de esa
magnitud. Como `uRenderOffset` cambia continuamente (la cámara se mueve fracciones
de UA por frame), el resultado redondeado **salta entre cubos de f32 cada frame**
→ jitter de amplitud ~0.4–0.8 UA. A pocas UA de la estrella eso es una fracción
enorme de la pantalla = «salta para todos lados». Coincide exactamente con el
reporte.

Nota: el atributo `position` en f32 ya tiene un error *estático* de ~sub-UA (queda
fijo por estrella, no salta — solo desplaza levemente). El **jitter** lo produce el
término *dinámico* (`uRenderOffset`) re-cuantizándose cada frame.

## 4. Por qué solo pasa con estrellas «cualquiera» del catálogo

Existe un cambio de contexto galaxy→system a 5000 UA del astro
(`packages/nav/src/context-switch.ts`, `enterSystemAtM: 7.5e14`). En `system` las
unidades son UA y cada cuerpo usa `toRenderSpace` por objeto (path f64 correcto) →
sin jitter.

**Pero** ese switch solo se arma para *host systems* registrados: el escaneo
`combined.nearestHostSystem()` (`packages/data/src/combined.ts:249`) recorre
`hostBySystemId`, que es el set curado (Sol + hosts de exoplanetas), **no** el
campo completo Gaia/HYG (`apps/web/src/scene/NavDriver.tsx:132-144`).

⇒ Si vuelas hacia Sol o un host de exoplaneta → desciende a `system`, sin jitter.
⇒ Si vuelas hacia una estrella cualquiera del catálogo (sin planetas) → nunca se
ancla, nunca cambia de contexto, se sigue dibujando como sprite del octree en pc
vía la suma f32 → **jitter**.

## 5. Punto ciego del gate de aceptación

`JitterProbe.tsx` mide el path correcto pero **no** reproduce este bug:

```js
// JitterProbe.tsx:114-126
origin.toRenderSpace(MARKER, renderScratch); // f64 → valor pequeño (~1 UA)
const fx = Math.fround(tx);                   // fround del resultado pequeño
markerRef.current.position.set(fx, fy, fz);
```

Hace `fround` del resultado **ya pequeño** (~1 UA, ULP ínfimo). Nunca suma dos
sumandos f32 de ~30 pc como hace el shader real. Por eso el gate está verde
mientras el bug existe. Cualquier fix debería venir con una variante de la probe
que ejercite `position(f32, ~30 pc) + uRenderOffset(f32, ~−30 pc)`.

## 6. Opciones de fix

### A — Offset emulated-double (hi/lo) en el shader de estrellas  ✅ recomendado
Pasar `uRenderOffset` como dos uniforms f32: `offHi = fround(off)` y
`offLo = fround(off − offHi)`, calculados en CPU desde el f64 de `toRenderSpace`.
El shader hace `(position + offHi) + offLo`.

- Por **Sterbenz**, `position + offHi` (dos f32 de magnitud similar y signo
  opuesto, dentro de un factor 2) es **exacto** en f32; `+ offLo` refina con la
  parte baja del offset → el término dinámico deja de cuantizarse → **jitter
  eliminado**.
- Residual: el error estático del atributo `position` f32 (~sub-UA, invisible).
- Coste: 1 uniform extra + 1 línea de shader + split del offset por frame. Cambio
  mínimo, alineado con el diseño de origen flotante. Aplica a **todas** las
  estrellas, ancladas o no.
- Si en el futuro hace falta precisión sub-UA también en el atributo, empaquetar
  `position` como par hi/lo (6 f32) — no necesario para matar el jitter actual.

### B — Hojas más pequeñas (octree más profundo)
Reduce `|position|` y por tanto el ULP. Es paliativo: no escala cuando te acercas
arbitrariamente, y agranda el pack. No resuelve la causa.

### C — Rebase del tile cercano en CPU por frame
Recalcular en f64 las posiciones del único tile que ocupa la cámara, relativas a
la cámara, y re-subir el buffer. Correcto pero implica un upload por frame; más
caro y más invasivo que A.

### D — Extender el descenso a contexto `system` a cualquier estrella
Crear un frame `system` «desnudo» (sin planetas) para cualquier astro al que te
acerques. Solución de producto a más largo plazo (define qué se ve al llegar);
ortogonal al jitter. No es el fix del bug.

**Recomendación:** A como fix puntual del jitter + probe que cubra el path real
(§5). C/D quedan como evolución, no como requisito para cerrar esto.

## 7. Archivos relevantes

- `packages/render-stars/src/shaders/stars.vert.glsl.ts` — la suma f32 (causa).
- `packages/render-stars/src/star-points.ts` — uniform `uRenderOffset`.
- `apps/web/src/scene/GalaxyScene.tsx:487-501` — feed del offset por frame.
- `tools/pack-octree/src/encode.ts:46` — posiciones tile-local f32.
- `apps/web/public/packs/octree-gaia/octree.json` — hoja mín. `halfExtent=32` pc.
- `packages/nav/src/context-switch.ts`, `apps/web/src/scene/NavDriver.tsx:132` —
  por qué solo afecta a estrellas sin host.
- `apps/web/src/scene/JitterProbe.tsx` — gate con punto ciego (§5).
