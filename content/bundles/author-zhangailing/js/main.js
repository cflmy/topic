/**
 * 张爱玲专题 — Three.js 背景 + 滚动与交互
 */
(function () {
  'use strict';

  const canvas = document.getElementById('zhang-canvas');
  if (!canvas || typeof THREE === 'undefined') return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* —— Three.js 场景 —— */
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0a0809, 0.038);

  const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 120);
  camera.position.set(0, 0, 14);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x0a0809, 1);

  /* 环境光 + 点光 */
  scene.add(new THREE.AmbientLight(0x3d2030, 0.6));
  const goldLight = new THREE.PointLight(0xd4af37, 1.8, 40);
  goldLight.position.set(4, 6, 8);
  scene.add(goldLight);
  const wineLight = new THREE.PointLight(0x8b2942, 1.2, 35);
  wineLight.position.set(-6, -3, 6);
  scene.add(wineLight);

  /* 粒子银河 */
  const particleCount = prefersReducedMotion ? 400 : 2200;
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);
  const gold = new THREE.Color(0xd4af37);
  const wine = new THREE.Color(0x6b1e3a);
  const white = new THREE.Color(0xfff8f0);

  for (let i = 0; i < particleCount; i++) {
    const i3 = i * 3;
    const radius = 4 + Math.random() * 18;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i3 + 1] = (Math.random() - 0.5) * 12;
    positions[i3 + 2] = radius * Math.sin(phi) * Math.sin(theta);

    const mix = Math.random();
    const c = mix < 0.35 ? gold : mix < 0.7 ? wine : white;
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
      size: prefersReducedMotion ? 0.04 : 0.065,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  scene.add(particles);

  /* 线框环面结 — 中心装饰 */
  const knot = new THREE.Mesh(
    new THREE.TorusKnotGeometry(1.1, 0.22, 128, 24),
    new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      metalness: 0.85,
      roughness: 0.25,
      emissive: 0x3d2810,
      emissiveIntensity: 0.35,
      wireframe: true,
      transparent: true,
      opacity: 0.55,
    }),
  );
  knot.position.set(2.5, 1.2, -2);
  scene.add(knot);

  /* 漂浮书页平面 */
  const pageMeshes = [];
  const pageMat = new THREE.MeshStandardMaterial({
    color: 0xfff8f0,
    metalness: 0.1,
    roughness: 0.9,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.12,
  });
  for (let p = 0; p < 6; p++) {
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 3), pageMat.clone());
    plane.position.set(
      (Math.random() - 0.5) * 14,
      (Math.random() - 0.5) * 8,
      (Math.random() - 0.5) * 10 - 4,
    );
    plane.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    pageMeshes.push(plane);
    scene.add(plane);
  }

  /* 鼠标视差 */
  let mouseX = 0;
  let mouseY = 0;
  document.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
    mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  /* 滚动驱动相机 */
  let scrollProgress = 0;
  function updateScroll() {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    scrollProgress = maxScroll > 0 ? window.scrollY / maxScroll : 0;
  }
  window.addEventListener('scroll', updateScroll, { passive: true });
  updateScroll();

  let time = 0;
  let animId = 0;

  function animate() {
    if (!prefersReducedMotion) {
      time += 0.008;
      particles.rotation.y = time * 0.15;
      particles.rotation.x = Math.sin(time * 0.2) * 0.08;
      knot.rotation.x = time * 0.4;
      knot.rotation.y = time * 0.55;
      pageMeshes.forEach((plane, i) => {
        plane.rotation.z += 0.002 + i * 0.0003;
        plane.position.y += Math.sin(time + i) * 0.002;
      });

      const targetZ = 14 - scrollProgress * 6;
      const targetY = scrollProgress * 2.5;
      camera.position.z += (targetZ - camera.position.z) * 0.04;
      camera.position.y += (targetY - camera.position.y) * 0.04;
      camera.position.x += (mouseX * 0.8 - camera.position.x) * 0.03;
      camera.lookAt(mouseX * 0.5, mouseY * 0.3 + targetY * 0.3, 0);

      goldLight.intensity = 1.5 + Math.sin(time * 2) * 0.3;
    }
    renderer.render(scene, camera);
    animId = requestAnimationFrame(animate);
  }

  function onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  window.addEventListener('resize', onResize);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(animId);
    } else {
      animate();
    }
  });

  animate();

  /* —— 区块滚动显现 —— */
  const sections = document.querySelectorAll('.section');
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add('is-visible');
      });
    },
    { threshold: 0.15, rootMargin: '0px 0px -8% 0px' },
  );
  sections.forEach((sec) => {
    if (sec.id !== 'hero') observer.observe(sec);
  });
  document.getElementById('hero')?.classList.add('is-visible');

  /* —— 作品卡片 3D 倾斜 —— */
  if (!prefersReducedMotion) {
    document.querySelectorAll('[data-tilt]').forEach((card) => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        card.style.transform = `perspective(600px) rotateY(${x * 12}deg) rotateX(${-y * 12}deg) translateZ(8px)`;
      });
      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
      });
    });
  }

  /* —— 名句轮播 —— */
  const quotes = document.querySelectorAll('.zhang-quote');
  const dotsContainer = document.getElementById('quote-dots');
  let quoteIndex = 0;
  let quoteTimer = 0;

  if (quotes.length && dotsContainer) {
    quotes.forEach((_, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.setAttribute('aria-label', `第 ${i + 1} 则`);
      if (i === 0) btn.classList.add('is-active');
      btn.addEventListener('click', () => goQuote(i));
      dotsContainer.appendChild(btn);
    });

    function goQuote(i) {
      quotes[quoteIndex].classList.remove('is-active');
      dotsContainer.children[quoteIndex].classList.remove('is-active');
      quoteIndex = i;
      quotes[quoteIndex].classList.add('is-active');
      dotsContainer.children[quoteIndex].classList.add('is-active');
    }

    function nextQuote() {
      goQuote((quoteIndex + 1) % quotes.length);
    }

    quoteTimer = window.setInterval(nextQuote, 7000);
    dotsContainer.addEventListener('click', () => {
      clearInterval(quoteTimer);
      quoteTimer = window.setInterval(nextQuote, 7000);
    });
  }
})();
