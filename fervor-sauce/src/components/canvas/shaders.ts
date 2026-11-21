import * as THREE from "three";

/* ------------------------------------------------------------------ */
/* Shared GLSL                                                          */
/* ------------------------------------------------------------------ */

/** 3D simplex noise (Ashima Arts / Stefan Gustavson, MIT). Prefixed to avoid clashes. */
export const NOISE_GLSL = /* glsl */ `
vec3 fv_mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 fv_mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 fv_permute(vec4 x) { return fv_mod289(((x * 34.0) + 10.0) * x); }
vec4 fv_taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float fv_snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = fv_mod289(i);
  vec4 p = fv_permute(fv_permute(fv_permute(
            i.z + vec4(0.0, i1.z, i2.z, 1.0))
          + i.y + vec4(0.0, i1.y, i2.y, 1.0))
          + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = fv_taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.5 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 105.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

float fv_fbm(vec3 p) {
  float a = 0.5;
  float s = 0.0;
  for (int i = 0; i < 4; i++) {
    s += a * fv_snoise(p);
    p = p * 2.03 + vec3(1.7, 9.2, 4.1);
    a *= 0.5;
  }
  return s;
}
`;

/* ------------------------------------------------------------------ */
/* Label: PBR paper + foil with a "burn" transition between flavours    */
/* ------------------------------------------------------------------ */

export interface BurnUniforms {
  uMapB: { value: THREE.Texture | null };
  uOrmB: { value: THREE.Texture | null };
  uProgress: { value: number };
  uEdgeColor: { value: THREE.Color };
}

export function createBurnUniforms(): BurnUniforms {
  return {
    uMapB: { value: null },
    uOrmB: { value: null },
    uProgress: { value: 0 },
    uEdgeColor: { value: new THREE.Color("#ffb04a") },
  };
}

/**
 * Patches a MeshPhysicalMaterial so `map`/`roughnessMap`/`metalnessMap` hold
 * the current label (A) and the uniforms hold the next one (B). As
 * `uProgress` goes 0 → 1, a noisy flame front spreads from the bottom of the
 * label, scorching the old print and revealing the new one behind a glowing
 * ember edge.
 */
export function applyBurnPatch(material: THREE.MeshPhysicalMaterial, u: BurnUniforms) {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, u);
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        /* glsl */ `#include <common>
        uniform sampler2D uMapB;
        uniform sampler2D uOrmB;
        uniform float uProgress;
        uniform vec3 uEdgeColor;
        ${NOISE_GLSL}`,
      )
      .replace(
        "#include <map_fragment>",
        /* glsl */ `
        float burnMix = 1.0;
        float burnGlow = 0.0;
        #ifdef USE_MAP
          vec2 bUv = vMapUv;
          vec4 sampledDiffuseColor = texture2D(map, bUv);
          // uniform branch: the noise only runs while a transition is in flight
          if (uProgress > 0.0005 && uProgress < 0.9995) {
            vec2 q = vec2((bUv.x - 0.5) * 5.1, bUv.y);
            float field = length(q - vec2(0.0, -0.15));
            field += fv_snoise(vec3(bUv.x * 13.0, bUv.y * 2.6, 1.7)) * 0.32;
            field += fv_snoise(vec3(bUv.x * 38.0, bUv.y * 7.4, 4.2)) * 0.09;
            float d = field - mix(-0.6, 3.3, uProgress);
            burnMix = smoothstep(-0.012, 0.012, d);
            burnGlow = 1.0 - smoothstep(0.0, 0.05, abs(d + 0.012));
            sampledDiffuseColor = mix(texture2D(uMapB, bUv), sampledDiffuseColor, burnMix);
            float scorch = (1.0 - smoothstep(0.0, 0.13, d)) * step(0.0, d);
            sampledDiffuseColor.rgb *= 1.0 - 0.88 * scorch;
          }
          diffuseColor *= sampledDiffuseColor;
        #endif
        `,
      )
      .replace(
        "#include <roughnessmap_fragment>",
        /* glsl */ `
        float roughnessFactor = roughness;
        #ifdef USE_ROUGHNESSMAP
          vec4 texelRoughness = mix(texture2D(uOrmB, vRoughnessMapUv), texture2D(roughnessMap, vRoughnessMapUv), burnMix);
          roughnessFactor *= texelRoughness.g;
        #endif
        `,
      )
      .replace(
        "#include <metalnessmap_fragment>",
        /* glsl */ `
        float metalnessFactor = metalness;
        #ifdef USE_METALNESSMAP
          vec4 texelMetalness = mix(texture2D(uOrmB, vMetalnessMapUv), texture2D(metalnessMap, vMetalnessMapUv), burnMix);
          metalnessFactor *= texelMetalness.b;
        #endif
        `,
      )
      .replace(
        "#include <emissivemap_fragment>",
        /* glsl */ `#include <emissivemap_fragment>
        totalEmissiveRadiance += uEdgeColor * burnGlow * 5.0;`,
      );
  };
  material.customProgramCacheKey = () => "fervor-label-burn";
}

/* ------------------------------------------------------------------ */
/* Sauce: procedural chunky chili sauce with seeds and flakes           */
/* ------------------------------------------------------------------ */

export interface SauceUniforms {
  uSauce: { value: THREE.Color };
  uDeep: { value: THREE.Color };
  uSeed: { value: THREE.Color };
  uGlow: { value: number };
}

export function createSauceUniforms(): SauceUniforms {
  return {
    uSauce: { value: new THREE.Color("#8f2108") },
    uDeep: { value: new THREE.Color("#3d0c03") },
    uSeed: { value: new THREE.Color("#e9c79a") },
    uGlow: { value: 0.07 },
  };
}

export function applySaucePatch(material: THREE.MeshPhysicalMaterial, u: SauceUniforms) {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, u);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vObjPos;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvObjPos = position;");
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        /* glsl */ `#include <common>
        varying vec3 vObjPos;
        uniform vec3 uSauce;
        uniform vec3 uDeep;
        uniform vec3 uSeed;
        uniform float uGlow;
        ${NOISE_GLSL}`,
      )
      .replace(
        "#include <map_fragment>",
        /* glsl */ `
        vec3 sp = vObjPos;
        float mott = fv_snoise(sp * 2.6) * 0.5 + 0.5;
        float mott2 = fv_snoise(sp * 8.5 + 4.0) * 0.5 + 0.5;
        vec3 sauceCol = mix(uDeep, uSauce, smoothstep(0.1, 0.9, mott * 0.65 + mott2 * 0.35));
        float seeds = smoothstep(0.6, 0.68, fv_snoise(sp * 19.0 + 11.0));
        float flakes = smoothstep(0.45, 0.55, fv_snoise(sp * vec3(9.0, 15.0, 9.0) + 3.0)) * (1.0 - seeds);
        float oil = smoothstep(0.55, 0.7, fv_snoise(sp * 4.0 + 20.0));
        sauceCol = mix(sauceCol, uDeep * 0.55, flakes * 0.8);
        sauceCol = mix(sauceCol, uSeed, seeds * 0.92);
        sauceCol = mix(sauceCol, sauceCol * 1.25 + vec3(0.02, 0.008, 0.0), oil * 0.35);
        diffuseColor.rgb = sauceCol;
        `,
      )
      .replace(
        "#include <roughnessmap_fragment>",
        /* glsl */ `
        float roughnessFactor = roughness * mix(1.0, 2.2, seeds) * mix(1.0, 0.55, oil);
        `,
      )
      .replace(
        "#include <emissivemap_fragment>",
        /* glsl */ `#include <emissivemap_fragment>
        totalEmissiveRadiance += sauceCol * uGlow;`,
      );
  };
  material.customProgramCacheKey = () => "fervor-sauce";
}

/* ------------------------------------------------------------------ */
/* Steam                                                                */
/* ------------------------------------------------------------------ */

export const steamVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const steamFragment = /* glsl */ `
uniform float uTime;
uniform float uOpacity;
uniform float uSeed;
uniform vec3 uColor;
varying vec2 vUv;
${NOISE_GLSL}
void main() {
  vec2 uv = vUv;
  float t = uTime * 0.16 + uSeed * 7.0;
  float sway = fv_snoise(vec3(uv.y * 1.4 - t * 1.3, uSeed, 0.0)) * 0.13 * smoothstep(0.0, 1.0, uv.y);
  float x = uv.x - 0.5 + sway;
  float width = mix(0.12, 0.46, smoothstep(0.0, 1.0, uv.y));
  float body = 1.0 - smoothstep(width * 0.35, width, abs(x));
  vec3 p = vec3(x * 3.2, uv.y * 2.4 - t * 2.2, uSeed * 3.0 + t * 0.3);
  float n = fv_fbm(p) * 0.5 + 0.5;
  float wisps = smoothstep(0.42, 0.9, n);
  float fadeIn = smoothstep(0.02, 0.22, uv.y);
  float fadeOut = 1.0 - smoothstep(0.4, 1.0, uv.y);
  float a = body * wisps * fadeIn * fadeOut * uOpacity;
  gl_FragColor = vec4(uColor, clamp(a, 0.0, 1.0));
}
`;

/* ------------------------------------------------------------------ */
/* Embers (rising sparks)                                               */
/* ------------------------------------------------------------------ */

export const emberVertex = /* glsl */ `
uniform float uTime;
uniform float uPixelRatio;
uniform float uSize;
uniform float uHeight;
attribute vec4 aRand;
varying float vLife;
varying float vHeat;
void main() {
  vec3 p = position;
  float speed = 0.25 + aRand.x * 0.55;
  float y = mod(p.y + uTime * speed + aRand.y * uHeight, uHeight);
  vLife = y / uHeight;
  p.y = y - uHeight * 0.42;
  p.x += sin(uTime * (0.6 + aRand.z) + aRand.y * 6.2831) * (0.18 + 0.35 * vLife);
  p.z += cos(uTime * (0.5 + aRand.w) + aRand.x * 6.2831) * 0.25;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float flicker = 0.65 + 0.35 * sin(uTime * (8.0 + aRand.w * 9.0) + aRand.x * 40.0);
  vHeat = flicker;
  gl_PointSize = uSize * (0.35 + aRand.z) * uPixelRatio * (1.0 - vLife * 0.6) * (6.0 / -mv.z);
}
`;

export const emberFragment = /* glsl */ `
uniform float uOpacity;
varying float vLife;
varying float vHeat;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  float core = smoothstep(0.5, 0.0, d);
  core = pow(core, 2.2);
  float life = smoothstep(0.0, 0.12, vLife) * (1.0 - smoothstep(0.55, 1.0, vLife));
  vec3 hot = vec3(1.0, 0.86, 0.55);
  vec3 warm = vec3(1.0, 0.36, 0.08);
  vec3 col = mix(warm, hot, core * vHeat);
  float a = core * life * vHeat * uOpacity;
  gl_FragColor = vec4(col * a, a);
}
`;

/* ------------------------------------------------------------------ */
/* Soft radial glow (halo + contact shadow)                             */
/* ------------------------------------------------------------------ */

export const glowVertex = steamVertex;

export const glowFragment = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
uniform float uPower;
varying vec2 vUv;
void main() {
  float d = length(vUv - 0.5) * 2.0;
  float a = pow(clamp(1.0 - d, 0.0, 1.0), uPower) * uOpacity;
  gl_FragColor = vec4(uColor * a, a);
}
`;

/**
 * Pure additive light over a transparent canvas: colour is added, the
 * destination alpha is left untouched, so glows brighten the HTML behind
 * the canvas instead of painting a translucent film over it.
 */
export function makeAdditiveLight<T extends THREE.Material>(material: T): T {
  material.blending = THREE.CustomBlending;
  material.blendEquation = THREE.AddEquation;
  material.blendSrc = THREE.OneFactor;
  material.blendDst = THREE.OneFactor;
  material.blendSrcAlpha = THREE.ZeroFactor;
  material.blendDstAlpha = THREE.OneFactor;
  material.transparent = true;
  material.depthWrite = false;
  return material;
}

/* ------------------------------------------------------------------ */
/* Clear quad                                                           */
/* ------------------------------------------------------------------ */

/**
 * three.js clears its transmission buffer to 50% white when the canvas is
 * transparent, which would make glass look milky over our dark DOM.
 * This far-plane quad (rendered last among opaque objects, no blending)
 * resets empty pixels to fully transparent — so the glass composites as
 * clear glass with additive reflections over whatever HTML sits behind it.
 */
export function createClearQuad(): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(2, 2);
  const mat = new THREE.ShaderMaterial({
    vertexShader: "void main(){ gl_Position = vec4(position.xy, 0.99999, 1.0); }",
    fragmentShader: "void main(){ gl_FragColor = vec4(0.0); }",
    blending: THREE.NoBlending,
    depthWrite: false,
    depthTest: true,
    transparent: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = 100000;
  return mesh;
}
