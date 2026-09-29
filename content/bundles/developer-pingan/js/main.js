/**
 * 平安 · 站点创作者 — 粉意花瓣与花笺
 */
(function () {
  'use strict';

  const canvas = document.getElementById('creator-canvas');
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* —— 飘落花瓣（2D） —— */
  if (canvas && !prefersReducedMotion) {
    const ctx = canvas.getContext('2d');
    const petals = [];
    const colors = [
      'rgba(253, 189, 219, 0.75)',
      'rgba(240, 168, 196, 0.7)',
      'rgba(255, 220, 235, 0.8)',
      'rgba(142, 180, 216, 0.45)',
      'rgba(255, 200, 210, 0.65)',
    ];

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    function spawn() {
      const count = Math.min(48, Math.floor(window.innerWidth / 28));
      petals.length = 0;
      for (let i = 0; i < count; i += 1) {
        petals.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          r: 3 + Math.random() * 5,
          vy: 0.25 + Math.random() * 0.55,
          vx: (Math.random() - 0.5) * 0.35,
          rot: Math.random() * Math.PI * 2,
          spin: (Math.random() - 0.5) * 0.02,
          color: colors[Math.floor(Math.random() * colors.length)],
        });
      }
    }

    function drawPetal(p) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, p.r * 1.2, p.r * 0.65, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    function tick() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      petals.forEach((p) => {
        p.y += p.vy;
        p.x += p.vx + Math.sin(p.y * 0.008) * 0.15;
        p.rot += p.spin;
        if (p.y > canvas.height + 12) {
          p.y = -12;
          p.x = Math.random() * canvas.width;
        }
        if (p.x < -12) p.x = canvas.width + 12;
        if (p.x > canvas.width + 12) p.x = -12;
        drawPetal(p);
      });
      requestAnimationFrame(tick);
    }

    resize();
    spawn();
    window.addEventListener('resize', () => {
      resize();
      spawn();
    });
    tick();
  }

  /* —— 打字机 —— */
  const lines = [
    '把想法变成可运行的网页，像把春色写成可点击的花笺。',
    '粉意界面 · 独立开发 · 社区运维',
    '暗恋见君论坛 — 由这里温柔生长',
  ];
  const el = document.getElementById('typed-line');
  if (el && !prefersReducedMotion) {
    let li = 0;
    let ci = 0;
    let deleting = false;

    function typeTick() {
      const line = lines[li];
      if (!deleting) {
        el.textContent = line.slice(0, ci + 1);
        ci += 1;
        if (ci === line.length) {
          deleting = true;
          setTimeout(typeTick, 2400);
          return;
        }
        setTimeout(typeTick, 58);
      } else {
        el.textContent = line.slice(0, ci - 1);
        ci -= 1;
        if (ci === 0) {
          deleting = false;
          li = (li + 1) % lines.length;
        }
        setTimeout(typeTick, 30);
      }
    }
    typeTick();
  } else if (el) {
    el.textContent = lines[0];
  }

  /* —— 花笺轮播 —— */
  const verses = [
    { text: '人面不知何处去，桃花依旧笑春风。', from: '崔护《题都城南庄》· 唐' },
    { text: '真葩固自异，美艳照华馆。', from: '韩维《百合花》· 宋' },
    { text: '入风茉莉四处香，天涯何处不春光。', from: '化用杨万里茉莉诗意' },
    { text: '世间本无双色玫，偏教心事染幽蓝。', from: '创作者短句 · 蓝玫瑰' },
    { text: '愿将清气付人间，不与浮华竞短长。', from: '创作者短句 · 茉莉' },
  ];
  const verseText = document.getElementById('verse-text');
  const verseFrom = document.getElementById('verse-from');
  if (verseText && verseFrom && !prefersReducedMotion) {
    let vi = 0;
    setInterval(() => {
      verseText.classList.add('is-fading');
      setTimeout(() => {
        vi = (vi + 1) % verses.length;
        verseText.textContent = verses[vi].text;
        verseFrom.textContent = verses[vi].from;
        verseText.classList.remove('is-fading');
      }, 400);
    }, 5200);
  }

  /* —— 滚动显现 —— */
  const sections = document.querySelectorAll('.section[data-section]');
  const hero = document.getElementById('hero');
  const obs = new IntersectionObserver(
    (entries) => entries.forEach((e) => {
      if (e.isIntersecting) e.target.classList.add('is-visible');
    }),
    { threshold: 0.12 },
  );
  sections.forEach((s) => obs.observe(s));
  if (hero) hero.classList.add('is-visible');

  /* —— 卡片轻倾 —— */
  if (!prefersReducedMotion) {
    document.querySelectorAll('[data-tilt]').forEach((card) => {
      card.addEventListener('mousemove', (e) => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = `perspective(700px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg)`;
      });
      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
      });
    });
  }
})();
