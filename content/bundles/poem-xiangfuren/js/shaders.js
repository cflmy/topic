/** 湘夫人 · GLSL 着色器（软光粒子 / 灵丝带 / 光晕环） */

export const mistParticleVert = /* glsl */`
  attribute float aSize;
  attribute float aPhase;
  attribute vec3 aTint;

  uniform float uTime;
  uniform float uScroll;
  uniform float uChapter;
  uniform vec2 uMouse;
  uniform float uPulse;

  varying vec3 vTint;
  varying float vShimmer;

  void main() {
    vec3 pos = position;

    float t = uTime * 0.35 + aPhase * 6.283;
    float swirl = uScroll * 3.1415 + uChapter * 0.8;
    pos.x += sin(t * 0.7 + swirl) * (1.2 + uChapter * 0.15);
    pos.y += cos(t * 0.55 + aPhase * 4.0) * (0.9 + sin(swirl) * 0.3);
    pos.z += sin(t * 0.4 + uScroll * 6.0) * 1.1 - uScroll * 8.0;

    vec2 m = uMouse * vec2(22.0, 14.0);
    vec2 d = pos.xy - m;
    float dist = length(d);
    float repel = smoothstep(4.5, 0.0, dist) * 1.8;
    pos.xy += normalize(d + 0.001) * repel;

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;

    float depth = clamp(-mv.z, 4.0, 50.0);
    gl_PointSize = aSize * (220.0 / depth) * (1.0 + uPulse * 0.35);

    vTint = aTint;
    vShimmer = 0.55 + 0.45 * sin(t * 2.0 + aPhase * 12.0);
  }
`;

export const mistParticleFrag = /* glsl */`
  varying vec3 vTint;
  varying float vShimmer;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if (d > 0.5) discard;

    float core = smoothstep(0.5, 0.0, d);
    float halo = smoothstep(0.5, 0.08, d);
    float alpha = core * 0.85 + halo * 0.25;
    alpha *= vShimmer;

    vec3 col = vTint * (0.9 + core * 0.4);
    gl_FragColor = vec4(col, alpha);
  }
`;

export const ribbonVert = /* glsl */`
  uniform float uTime;
  uniform float uChapter;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying float vFresnel;

  void main() {
    vUv = uv;
    vec3 pos = position;
    float wave = sin(uv.x * 12.0 + uTime * 0.6) * 0.08 * (1.0 + uChapter * 0.35);
    pos += normal * wave;

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;
    vNormal = normalize(normalMatrix * normal);
    vec3 viewDir = normalize(-mv.xyz);
    vFresnel = pow(1.0 - abs(dot(vNormal, viewDir)), 2.5);
  }
`;

export const ribbonFrag = /* glsl */`
  uniform float uTime;
  uniform float uChapter;
  uniform vec3 uColorA;
  uniform vec3 uColorB;

  varying vec2 vUv;
  varying float vFresnel;

  void main() {
    float flow = sin(vUv.x * 24.0 - uTime * 1.2) * 0.5 + 0.5;
    float pulse = sin(uTime * 0.5 + uChapter) * 0.5 + 0.5;
    vec3 base = mix(uColorA, uColorB, flow * 0.6 + pulse * 0.2);
    float glow = vFresnel * (0.7 + uChapter * 0.15);
    float alpha = 0.12 + glow * 0.55 + flow * 0.08;
    gl_FragColor = vec4(base + glow * 0.35, alpha);
  }
`;

export const haloVert = /* glsl */`
  varying vec3 vNormal;
  varying float vFresnel;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    vec3 viewDir = normalize(-mv.xyz);
    vFresnel = pow(1.0 - abs(dot(vNormal, viewDir)), 3.0);
  }
`;

export const haloFrag = /* glsl */`
  uniform float uTime;
  uniform vec3 uColor;
  uniform float uIntensity;

  varying float vFresnel;

  void main() {
    float pulse = sin(uTime * 0.8) * 0.5 + 0.5;
    float alpha = vFresnel * uIntensity * (0.35 + pulse * 0.25);
    gl_FragColor = vec4(uColor, alpha);
  }
`;
