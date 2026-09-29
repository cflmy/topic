/**
 * 钗头凤 · 红酥手 — Three.js 春雨落花与错过之境
 */
(function () {
  'use strict';

  const canvas = document.getElementById('ctf-canvas');
  if (!canvas || typeof THREE === 'undefined') return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0c0e12, 0.042);

  const camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0.5, 13);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x0c0e12, 1);

  scene.add(new THREE.AmbientLight(0x2a1a22, 0.65));
  const peachLight = new THREE.PointLight(0xc48a8a, 1.4, 45);
  peachLight.position.set(3, 4, 6);
  scene.add(peachLight);
  const wineLight = new THREE.PointLight(0x6b2438, 1.1, 38);
  wineLight.position.set(-5, -2, 5);
  scene.add(wineLight);

  /* 星尘粒子 */
  const particleCount = prefersReducedMotion ? 350 : 1800;
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);
  const cPeach = new THREE.Color(0xc48a8a);
  const cWine = new THREE.Color(0x6b2438);
  const cAsh = new THREE.Color(0x5a5a62);

  for (let i = 0; i < particleCount; i++) {
    const i3 = i * 3;
    const r = 3 + Math.random() * 16;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i3 + 1] = (Math.random() - 0.5) * 10;
    positions[i3 + 2] = r * Math.sin(phi) * Math.sin(theta) - 4;
    const mix = Math.random();
    const c = mix < 0.4 ? cPeach : mix < 0.75 ? cWine : cAsh;
    colors[i3] = c.r;
    colors[i3 + 1] = c.g;
    colors[i3 + 2] = c.b;
  }

  const particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const particles = new THREE.Points(
    particleGeo,
    new THREE.PointsMaterial({
      size: prefersReducedMotion ? 0.035 : 0.055,
      vertexColors: true,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  scene.add(particles);

  /* 钗形线环 — 镂空金饰 */
  const hairpin = new THREE.Mesh(
    new THREE.TorusGeometry(1.35, 0.04, 12, 64),
    new THREE.MeshStandardMaterial({
      color: 0x9a7b5a,
      metalness: 0.9,
      roughness: 0.3,
      emissive: 0x3d1525,
      emissiveIntensity: 0.25,
      wireframe: true,
      transparent: true,
      opacity: 0.5,
    }),
  );
  hairpin.rotation.x = Math.PI / 2.2;
  hairpin.position.set(0, 0.8, -3);
  scene.add(hairpin);

  const hairpinGem = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.22, 0),
    new THREE.MeshStandardMaterial({
      color: 0xc48a8a,
      emissive: 0x6b2438,
      emissiveIntensity: 0.6,
      metalness: 0.4,
      roughness: 0.2,
      transparent: true,
      opacity: 0.85,
    }),
  );
  hairpinGem.position.set(0, 1.1, -3);
  scene.add(hairpinGem);

  /* 飘落花瓣平面 */
  const petalMeshes = [];
  const petalMat = new THREE.MeshStandardMaterial({
    color: 0xc48a8a,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.22,
    roughness: 0.95,
    metalness: 0,
  });
  const petalCount = prefersReducedMotion ? 4 : 14;
  for (let p = 0; p < petalCount; p++) {
    const petal = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 0.22), petalMat.clone());
    petal.userData = {
      speedY: 0.008 + Math.random() * 0.012,
      speedX: (Math.random() - 0.5) * 0.006,
      phase: Math.random() * Math.PI * 2,
      baseX: (Math.random() - 0.5) * 14,
      baseZ: (Math.random() - 0.5) * 8 - 2,
    };
    petal.position.set(petal.userData.baseX, 4 + Math.random() * 6, petal.userData.baseZ);
    petal.rotation.set(Math.random(), Math.random(), Math.random());
    petalMeshes.push(petal);
    scene.add(petal);
  }

  /* 细雨线 */
  const rainCount = prefersReducedMotion ? 80 : 400;
  const rainPos = new Float32Array(rainCount * 3);
  for (let i = 0; i < rainCount; i++) {
    const i3 = i * 3;
    rainPos[i3] = (Math.random() - 0.5) * 24;
    rainPos[i3 + 1] = Math.random() * 14;
    rainPos[i3 + 2] = (Math.random() - 0.5) * 12 - 3;
  }
  const rainGeo = new THREE.BufferGeometry();
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
  const rain = new THREE.Points(
    rainGeo,
    new THREE.PointsMaterial({
      color: 0x7a8a9a,
      size: 0.04,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    }),
  );
  scene.add(rain);

  let mouseX = 0;
  let mouseY = 0;
  document.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
    mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  let scrollProgress = 0;
  function updateScroll() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    scrollProgress = max > 0 ? window.scrollY / max : 0;
  }
  window.addEventListener('scroll', updateScroll, { passive: true });
  updateScroll();

  let time = 0;
  let animId = 0;

  function animate() {
    if (!prefersReducedMotion) {
      time += 0.007;
      particles.rotation.y = time * 0.1;
      particles.rotation.x = Math.sin(time * 0.15) * 0.05;
      hairpin.rotation.z = time * 0.25;
      hairpinGem.rotation.y = time * 0.5;
      hairpinGem.position.y = 1.1 + Math.sin(time * 1.2) * 0.08;

      petalMeshes.forEach((petal, i) => {
        const u = petal.userData;
        petal.position.y -= u.speedY;
        petal.position.x += u.speedX + Math.sin(time + u.phase) * 0.004;
        petal.rotation.z += 0.008;
        if (petal.position.y < -5) {
          petal.position.y = 6 + Math.random() * 4;
          petal.position.x = u.baseX + (Math.random() - 0.5) * 2;
        }
      });

      const rainAttr = rain.geometry.attributes.position;
      for (let i = 0; i < rainCount; i++) {
        const i3 = i * 3;
        rainAttr.array[i3 + 1] -= 0.06 + (i % 3) * 0.01;
        if (rainAttr.array[i3 + 1] < -4) {
          rainAttr.array[i3 + 1] = 8 + Math.random() * 4;
        }
      }
      rainAttr.needsUpdate = true;

      const targetZ = 13 - scrollProgress * 5;
      const targetY = 0.5 + scrollProgress * 1.8;
      camera.position.z += (targetZ - camera.position.z) * 0.04;
      camera.position.y += (targetY - camera.position.y) * 0.04;
      camera.position.x += (mouseX * 0.6 - camera.position.x) * 0.03;
      camera.lookAt(mouseX * 0.4, mouseY * 0.25 + targetY * 0.2, -2);

      peachLight.intensity = 1.2 + Math.sin(time * 1.5) * 0.25;
      wineLight.intensity = 0.9 + Math.cos(time * 1.1) * 0.2;
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

  /* —— 滚动显现 —— */
  const sections = document.querySelectorAll('.section[data-section]');
  const observer = new IntersectionObserver(
    (entries) => entries.forEach((e) => {
      if (e.isIntersecting) e.target.classList.add('is-visible');
    }),
    { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
  );
  sections.forEach((sec) => observer.observe(sec));

  /* —— 卡片轻倾 —— */
  if (!prefersReducedMotion) {
    document.querySelectorAll('[data-tilt]').forEach((card) => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        card.style.transform = `perspective(600px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg)`;
      });
      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
      });
    });
  }
})();
