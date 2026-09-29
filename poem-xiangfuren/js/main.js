/**
 * 九歌 · 湘夫人 — 滚动幻境 + 着色器雾粒子 + 灵韵丝带
 * 参考 Codrops GPGPU 粒子思路，以自定义 Shader 与滚动叙事实现华美而不厚重
 */
import * as THREE from 'three';
import {
  mistParticleVert,
  mistParticleFrag,
  ribbonVert,
  ribbonFrag,
  haloVert,
  haloFrag,
} from './shaders.js';

const SCENE_PALETTE = [
  { a: [0.92, 0.94, 0.97], b: [0.78, 0.72, 0.86], fog: 0xf8fafc }, // 0 候
  { a: [0.88, 0.91, 0.96], b: [0.72, 0.68, 0.82], fog: 0xf4f6fa }, // 1 期约
  { a: [0.90, 0.88, 0.94], b: [0.68, 0.62, 0.78], fog: 0xf2f0f6 }, // 2 长思
  { a: [0.96, 0.90, 0.94], b: [0.82, 0.68, 0.78], fog: 0xfaf4f8 }, // 3 幻境
  { a: [0.94, 0.95, 0.97], b: [0.74, 0.76, 0.84], fog: 0xf6f8fa }, // 4 余韵
];

const state = {
  scroll: 0,
  chapter: 0,
  chapterBlend: 0,
  mouse: new THREE.Vector2(0, 0),
  mouseSmooth: new THREE.Vector2(0, 0),
};

(function initScene() {
  'use strict';

  const canvas = document.getElementById('xf-canvas');
  if (!canvas) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const particleCount = prefersReducedMotion ? 900 : 3200;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(SCENE_PALETTE[0].fog, 0.022);

  const camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.1, 120);
  camera.position.set(0, 0, 16);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0xffffff, 0);

  /* —— 雾粒子（着色器软光） —— */
  const positions = new Float32Array(particleCount * 3);
  const sizes = new Float32Array(particleCount);
  const phases = new Float32Array(particleCount);
  const tints = new Float32Array(particleCount * 3);

  for (let i = 0; i < particleCount; i++) {
    const i3 = i * 3;
    const radius = 6 + Math.random() * 18;
    const angle = Math.random() * Math.PI * 2;
    positions[i3] = Math.cos(angle) * radius;
    positions[i3 + 1] = (Math.random() - 0.5) * 16;
    positions[i3 + 2] = Math.sin(angle) * radius - 12 - Math.random() * 30;
    sizes[i] = 0.35 + Math.random() * 1.1;
    phases[i] = Math.random();

    const lavender = Math.random() < 0.45;
    tints[i3] = lavender ? 0.82 + Math.random() * 0.12 : 0.94 + Math.random() * 0.05;
    tints[i3 + 1] = lavender ? 0.78 + Math.random() * 0.1 : 0.95 + Math.random() * 0.04;
    tints[i3 + 2] = lavender ? 0.88 + Math.random() * 0.1 : 0.98 + Math.random() * 0.02;
  }

  const particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  particleGeo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  particleGeo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
  particleGeo.setAttribute('aTint', new THREE.BufferAttribute(tints, 3));

  const particleUniforms = {
    uTime: { value: 0 },
    uScroll: { value: 0 },
    uChapter: { value: 0 },
    uMouse: { value: new THREE.Vector2(0, 0) },
    uPulse: { value: 0 },
  };

  const particles = new THREE.Points(
    particleGeo,
    new THREE.ShaderMaterial({
      uniforms: particleUniforms,
      vertexShader: mistParticleVert,
      fragmentShader: mistParticleFrag,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  scene.add(particles);

  /* —— 灵韵丝带（水中神女意象） —— */
  const ribbonCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-5, 1.2, -8),
    new THREE.Vector3(-2, -0.5, -14),
    new THREE.Vector3(1.5, 1.8, -20),
    new THREE.Vector3(4, 0.2, -26),
    new THREE.Vector3(2, -1.2, -32),
    new THREE.Vector3(-3, 0.8, -38),
  ]);
  const ribbonUniforms = {
    uTime: { value: 0 },
    uChapter: { value: 0 },
    uColorA: { value: new THREE.Vector3(0.92, 0.94, 0.98) },
    uColorB: { value: new THREE.Vector3(0.78, 0.70, 0.86) },
  };
  const ribbon = new THREE.Mesh(
    new THREE.TubeGeometry(ribbonCurve, 220, 0.14, 12, false),
    new THREE.ShaderMaterial({
      uniforms: ribbonUniforms,
      vertexShader: ribbonVert,
      fragmentShader: ribbonFrag,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    }),
  );
  scene.add(ribbon);

  /* —— 光晕环（幻境章节加强） —— */
  const haloUniforms = {
    uTime: { value: 0 },
    uColor: { value: new THREE.Vector3(0.88, 0.82, 0.94) },
    uIntensity: { value: 0.35 },
  };
  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(5.5, 0.03, 16, 120),
    new THREE.ShaderMaterial({
      uniforms: haloUniforms,
      vertexShader: haloVert,
      fragmentShader: haloFrag,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  halo.rotation.x = Math.PI * 0.42;
  halo.position.set(0, 0.5, -18);
  scene.add(halo);

  const halo2 = halo.clone();
  halo2.scale.set(0.72, 0.72, 0.72);
  halo2.rotation.z = Math.PI * 0.25;
  scene.add(halo2);

  /* —— 落瓣（Instanced 薄片） —— */
  const petalCount = prefersReducedMotion ? 24 : 64;
  const petalGeo = new THREE.PlaneGeometry(0.22, 0.14);
  const petalMesh = new THREE.InstancedMesh(
    petalGeo,
    new THREE.MeshBasicMaterial({
      color: 0xd8c8d8,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
    petalCount,
  );
  const petalData = [];
  const dummy = new THREE.Object3D();
  for (let i = 0; i < petalCount; i++) {
    const p = {
      x: (Math.random() - 0.5) * 24,
      y: 4 + Math.random() * 12,
      z: -8 - Math.random() * 28,
      fall: 0.008 + Math.random() * 0.014,
      sway: Math.random() * Math.PI * 2,
      rot: Math.random() * Math.PI,
    };
    petalData.push(p);
    dummy.position.set(p.x, p.y, p.z);
    dummy.rotation.set(Math.random(), p.rot, Math.random() * 0.4);
    dummy.updateMatrix();
    petalMesh.setMatrixAt(i, dummy.matrix);
  }
  petalMesh.instanceMatrix.needsUpdate = true;
  scene.add(petalMesh);

  window.addEventListener('mousemove', (e) => {
    state.mouse.x = (e.clientX / window.innerWidth - 0.5) * 2;
    state.mouse.y = -(e.clientY / window.innerHeight - 0.5) * 2;
  });

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  let t = 0;
  renderer.setAnimationLoop(() => {
    if (!prefersReducedMotion) {
      t += 0.016;
      state.mouseSmooth.lerp(state.mouse, 0.06);

      const pal = SCENE_PALETTE[state.chapter] || SCENE_PALETTE[0];
      const next = SCENE_PALETTE[Math.min(state.chapter + 1, SCENE_PALETTE.length - 1)];
      const blend = state.chapterBlend;

      const mix = (a, b) => a + (b - a) * blend;
      ribbonUniforms.uColorA.value.set(
        mix(pal.a[0], next.a[0]),
        mix(pal.a[1], next.a[1]),
        mix(pal.a[2], next.a[2]),
      );
      ribbonUniforms.uColorB.value.set(
        mix(pal.b[0], next.b[0]),
        mix(pal.b[1], next.b[1]),
        mix(pal.b[2], next.b[2]),
      );

      particleUniforms.uTime.value = t;
      particleUniforms.uScroll.value = state.scroll;
      particleUniforms.uChapter.value = state.chapter + blend;
      particleUniforms.uMouse.value.copy(state.mouseSmooth);
      particleUniforms.uPulse.value = 0.5 + 0.5 * Math.sin(t * 0.7);

      ribbonUniforms.uTime.value = t;
      ribbonUniforms.uChapter.value = state.chapter + blend;
      haloUniforms.uTime.value = t;
      haloUniforms.uIntensity.value = 0.25 + (state.chapter === 3 ? 0.55 : 0.15) + blend * 0.2;

      const fogCur = new THREE.Color(pal.fog);
      const fogNext = new THREE.Color(next.fog);
      fogCur.lerp(fogNext, blend);
      scene.fog.color.copy(fogCur);

      ribbon.rotation.y = Math.sin(t * 0.15) * 0.12 + state.scroll * 0.4;
      halo.rotation.y += 0.002;
      halo2.rotation.y -= 0.0015;
      halo.position.z = -16 - state.scroll * 12;
      ribbon.position.y = Math.sin(t * 0.25) * 0.3;

      for (let i = 0; i < petalCount; i++) {
        const p = petalData[i];
        p.y -= p.fall;
        p.x += Math.sin(t + p.sway) * 0.004;
        if (p.y < -8) {
          p.y = 10 + Math.random() * 8;
          p.x = (Math.random() - 0.5) * 24;
        }
        dummy.position.set(p.x, p.y, p.z - state.scroll * 6);
        dummy.rotation.set(Math.sin(t * 0.5 + p.sway) * 0.4, p.rot + t * 0.2, 0);
        dummy.updateMatrix();
        petalMesh.setMatrixAt(i, dummy.matrix);
      }
      petalMesh.instanceMatrix.needsUpdate = true;
    }

    const targetZ = 16 - state.scroll * 22;
    const targetY = state.mouseSmooth.y * 0.6;
    const targetX = state.mouseSmooth.x * 1.2;
    camera.position.z += (targetZ - camera.position.z) * 0.04;
    camera.position.x += (targetX - camera.position.x) * 0.03;
    camera.position.y += (targetY - camera.position.y) * 0.03;
    camera.lookAt(0, 0, -20 - state.scroll * 10);

    renderer.render(scene, camera);
  });
})();

/* —— 滚动叙事：章节幻境 + 诗句 + 场景指示 —— */
(function scrollNarrative() {
  const sections = document.querySelectorAll('.section');
  const poems = document.querySelectorAll('.xf-poem[data-reveal]');
  const sceneSections = document.querySelectorAll('[data-scene]');
  const indicator = document.getElementById('xf-scene-dots');
  const dots = indicator ? indicator.querySelectorAll('[data-dot]') : [];
  const root = document.documentElement;

  const sectionIo = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) e.target.classList.add('is-visible');
      });
    },
    { threshold: 0.08, rootMargin: '0px 0px -5% 0px' },
  );
  sections.forEach((s) => sectionIo.observe(s));

  const poemIo = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) e.target.classList.add('is-revealed');
      });
    },
    { threshold: 0.15 },
  );
  poems.forEach((p) => poemIo.observe(p));

  /* 诗后内容：段落 / 主题流 / 见君 */
  const proseIo = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const el = e.target;
        el.classList.add('is-revealed');
        el.querySelectorAll('.xf-prose__p').forEach((p, i) => {
          setTimeout(() => p.classList.add('is-in'), i * 120);
        });
      });
    },
    { threshold: 0.12 },
  );
  document.querySelectorAll('[data-reveal-prose]').forEach((el) => proseIo.observe(el));

  const staggerIo = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) e.target.classList.add('is-revealed');
      });
    },
    { threshold: 0.1 },
  );
  document.querySelectorAll('[data-reveal-stagger]').forEach((el) => staggerIo.observe(el));

  document.querySelectorAll('.xf-theme').forEach((t) => {
    t.style.setProperty('--i', t.dataset.i || '0');
  });
  document.querySelectorAll('.xf-bridge__phrase').forEach((p) => {
    p.style.setProperty('--i', p.dataset.i || '0');
  });

  document.querySelector('.xf-hero')?.classList.add('is-visible');

  function updateScene() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    state.scroll = max > 0 ? window.scrollY / max : 0;

    let best = 0;
    let bestScore = Infinity;
    let blend = 0;

    sceneSections.forEach((sec) => {
      const rect = sec.getBoundingClientRect();
      const center = rect.top + rect.height * 0.5;
      const score = Math.abs(center - window.innerHeight * 0.42);
      if (score < bestScore) {
        bestScore = score;
        best = parseInt(sec.dataset.scene, 10) || 0;
        const visible = Math.min(rect.height, window.innerHeight);
        blend = Math.min(1, Math.max(0, 1 - score / (visible * 0.5)));
      }
    });

    state.chapter = best;
    state.chapterBlend = blend;

    const pal = SCENE_PALETTE[best] || SCENE_PALETTE[0];
    root.style.setProperty('--xf-glow', `rgba(${Math.round(pal.b[0] * 255)}, ${Math.round(pal.b[1] * 255)}, ${Math.round(pal.b[2] * 255)}, 0.35)`);
    root.style.setProperty('--xf-scene-shift', `${blend * 100}%`);

    dots.forEach((dot) => {
      const n = parseInt(dot.dataset.dot, 10);
      dot.classList.toggle('is-active', n === best);
      dot.classList.toggle('is-near', Math.abs(n - best) === 1);
    });

    document.body.dataset.scene = String(best);
  }

  window.addEventListener('scroll', updateScene, { passive: true });
  window.addEventListener('resize', updateScene);
  updateScene();

  /* 诗句轻微视差 */
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    window.addEventListener('mousemove', (e) => {
      const mx = (e.clientX / window.innerWidth - 0.5) * 2;
      const my = (e.clientY / window.innerHeight - 0.5) * 2;
      poems.forEach((poem) => {
        if (!poem.classList.contains('is-revealed')) return;
        poem.style.setProperty('--tilt-x', `${my * -1.5}deg`);
        poem.style.setProperty('--tilt-y', `${mx * 1.5}deg`);
      });
    });
  }
})();
