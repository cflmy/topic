/**
 * 从你的全世界路过 — Three.js（本地 ES 模块）+ 交互
 */
import * as THREE from 'three';
import { PYW_IMAGES } from './images.js';

const canvas = document.getElementById('pyw-canvas');
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (canvas) {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xe8d4f0, 8, 42);

  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 80);
  camera.position.set(0, 0, 12);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0);

  scene.add(new THREE.AmbientLight(0xfff8f0, 0.85));
  const sun = new THREE.DirectionalLight(0xffeedd, 0.9);
  sun.position.set(5, 8, 10);
  scene.add(sun);
  const fill = new THREE.PointLight(0xf0b8c0, 0.8, 30);
  fill.position.set(-4, 2, 6);
  scene.add(fill);

  const loader = new THREE.TextureLoader();
  const textureUrls = [PYW_IMAGES.heroNear, PYW_IMAGES.heroMid, PYW_IMAGES.lavender];
  const planes = [];
  const planeZ = [-8, -12, -16];
  const planeScale = [14, 12, 16];

  textureUrls.forEach((url, i) => {
    loader.load(
      url,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        const mat = new THREE.MeshBasicMaterial({
          map: tex,
          transparent: true,
          opacity: 0.22 + i * 0.04,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
        const mesh = new THREE.Mesh(
          new THREE.PlaneGeometry(planeScale[i], planeScale[i] * 0.55),
          mat,
        );
        mesh.position.set((i - 1) * 2.5, -0.5 + i * 0.3, planeZ[i]);
        mesh.userData.idx = i;
        planes.push(mesh);
        scene.add(mesh);
      },
      undefined,
      () => {},
    );
  });

  const count = prefersReducedMotion ? 280 : 1200;
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const c1 = new THREE.Color(0xf5d4c8);
  const c2 = new THREE.Color(0xe8c49a);
  const c3 = new THREE.Color(0xf0b8c0);

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    pos[i3] = (Math.random() - 0.5) * 28;
    pos[i3 + 1] = (Math.random() - 0.5) * 16;
    pos[i3 + 2] = (Math.random() - 0.5) * 20 - 4;
    const c = Math.random() < 0.33 ? c1 : Math.random() < 0.66 ? c2 : c3;
    col[i3] = c.r;
    col[i3 + 1] = c.g;
    col[i3 + 2] = c.b;
  }

  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  pGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const petals = new THREE.Points(
    pGeo,
    new THREE.PointsMaterial({
      size: prefersReducedMotion ? 0.05 : 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  scene.add(petals);

  const windmill = new THREE.Group();
  windmill.add(
    new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.05, 2.2, 8),
      new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 }),
    ),
  );
  for (let b = 0; b < 4; b++) {
    const blade = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 1.4, 0.02),
      new THREE.MeshStandardMaterial({
        color: 0xfff8f0,
        transparent: true,
        opacity: 0.4,
        emissive: 0xe8c49a,
        emissiveIntensity: 0.2,
      }),
    );
    blade.position.y = 0.7;
    blade.rotation.z = (b * Math.PI) / 2;
    windmill.add(blade);
  }
  windmill.position.set(5, 1.5, -6);
  scene.add(windmill);

  let mouseX = 0;
  let mouseY = 0;
  document.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
    mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  let scrollP = 0;
  window.addEventListener(
    'scroll',
    () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      scrollP = max > 0 ? window.scrollY / max : 0;
      const y = window.scrollY;
      document.querySelectorAll('.pyw-hero__layer').forEach((el, i) => {
        el.style.setProperty('--pyw-scroll', `${y * (i + 1) * 0.06}px`);
      });
    },
    { passive: true },
  );

  let t = 0;
  let animId = 0;

  function animate() {
    if (!prefersReducedMotion) {
      t += 0.006;
      petals.rotation.y = t * 0.08;
      windmill.rotation.y = t * 0.35;
      windmill.children.forEach((ch, i) => {
        if (i > 0) ch.rotation.z = (i - 1) * (Math.PI / 2) + t * 0.5;
      });
      planes.forEach((mesh) => {
        const i = mesh.userData.idx;
        mesh.position.x = (i - 1) * 2.5 + Math.sin(t + i) * 0.3 + mouseX * 0.4;
        mesh.position.y = -0.5 + i * 0.3 + mouseY * 0.2;
      });
      const targetZ = 12 - scrollP * 4;
      camera.position.z += (targetZ - camera.position.z) * 0.04;
      camera.position.x += (mouseX * 0.5 - camera.position.x) * 0.03;
      camera.position.y += (mouseY * 0.3 - camera.position.y) * 0.03;
      camera.lookAt(mouseX * 0.3, mouseY * 0.2, -4);
    }
    renderer.render(scene, camera);
    animId = requestAnimationFrame(animate);
  }

  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
  window.addEventListener('resize', onResize);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(animId);
    else animate();
  });
  animate();
}

document.querySelectorAll('.section[data-section]').forEach((sec) => {
  const obs = new IntersectionObserver(
    (entries) => entries.forEach((e) => {
      if (e.isIntersecting) e.target.classList.add('is-visible');
    }),
    { threshold: 0.08 },
  );
  obs.observe(sec);
});

if (!prefersReducedMotion) {
  document.querySelectorAll('[data-tilt]').forEach((card) => {
    card.addEventListener('mousemove', (e) => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `perspective(700px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg) translateZ(6px)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });
}

const filmLines = [
  { text: '我希望有个如你一般的人，如山间清爽的风，如古城温暖的光，只要最后是你就好。今天，你路过了谁？谁又丢失了你呢？', from: '陈末 · 电台开场' },
  { text: '有一个地方，叫做稻城。我要和我最心爱的人，一起去到那里，看蔚蓝的天空，看白色的雪山，看金黄的草地，看一场秋天的童话。', from: '陈末 · 稻城告白' },
  { text: '如果没有住在你的心里，都是客死他乡。相爱这件事情，就是永远在一起。', from: '陈末 · 电台' },
  { text: '闭嘴！你三十二岁，半截入土了还瞎琢磨。你就是一咸鸭蛋——被腌过了！', from: '幺鸡 · 怒怼热线听众' },
  { text: '生活是漫长的，如果你做了一个错误的决定，你就肯定彻底地陷入了煎熬。', from: '陈末 · 安慰悔婚听众' },
  { text: '猪头，我爱你！猪头的爱情就像坐标，只要他爱着燕子，那么我们，就是年轻的。', from: '猪头 · 天台告白' },
  { text: '我不要坚强，我要吃妈妈做的菜！幺鸡虽小，但是没有幺鸡，也胡不了十三幺。', from: '幺鸡与陈末 · 安慰女孩' },
  { text: '当你全力以赴打算对一个人好的时候，你就变成了傻子、聋子，眼里除了他，什么人都没有。', from: '幺鸡 · 无意识告白' },
  { text: '我会在导航仪里，一直陪着你。只要有太阳照常升起，导航仪就永远有电。我永远在你身边。', from: '茅十八 · 给荔枝' },
  { text: '我对她好，其实是我不好。她对我不好，其实是对我好。', from: '猪头 · 燕子分手' },
  { text: '燕子，没有你，我怎么活啊？', from: '猪头' },
  { text: '因为心里有爱，节目才会有爱。当我们自己感到孤独的时候，我们无法温暖别人。', from: '小容 · 代班' },
  { text: '对我来说，相爱就可以；对我来说，适合才重要。我要去更高的地方看一眼，哪怕现在过得再辛苦。', from: '小容 · 拒绝陈末' },
  { text: '我多希望，我的生活可以和墙上的画一样，越来越美好。', from: '幺鸡 · 涂鸦伞' },
  { text: '人一辈子会听到很多心里话。沙城就是一个人的记忆，一旦双手陷入，整座城市就会轰隆隆地崩塌。', from: '陈末 · 想念幺鸡' },
  { text: '如果只是路过，我就在终点等你。', from: '陈末 · 青德乡' },
  { text: '荔枝，我爱你。我永远爱你。', from: '茅十八 · 导航预设' },
  { text: '一个人，终将拥有另一个人，对你点点头，贯彻未来，数遍生命的公路牌。', from: '陈末 · 稻城重逢' },
];

const cText = document.getElementById('carousel-text');
const cFrom = document.getElementById('carousel-from');
const cDots = document.getElementById('carousel-dots');
if (cText && cFrom && cDots) {
  let ci = 0;
  filmLines.forEach((_, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.setAttribute('aria-label', `第 ${i + 1} 条`);
    if (i === 0) btn.classList.add('is-active');
    btn.addEventListener('click', () => go(i));
    cDots.appendChild(btn);
  });

  function go(i) {
    cText.classList.add('is-fading');
    setTimeout(() => {
      ci = i;
      cText.textContent = filmLines[ci].text;
      cFrom.textContent = filmLines[ci].from;
      cText.classList.remove('is-fading');
      [...cDots.children].forEach((d, j) => d.classList.toggle('is-active', j === ci));
    }, 280);
  }

  go(0);
  if (!prefersReducedMotion) {
    setInterval(() => go((ci + 1) % filmLines.length), 6000);
  }
}
