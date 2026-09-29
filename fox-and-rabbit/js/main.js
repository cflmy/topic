/**
 * 渲染「故事 ‖ 绘本 + 讲解」交织阅读，并保留轻量动效
 */
(function () {
  const scenes = window.FoxRabbitScenes || [];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.getElementById('fr-scenes');
  const toc = document.getElementById('fr-toc');

  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function asideNarration(s) {
    const parts = [];
    if (s.narration) parts.push(s.narration);
    if (s.epilogue) parts.push(s.epilogue);
    if (!parts.length) return '';
    return (
      '<aside class="fr-scene__aside" aria-label="旁白">' +
      '<p class="fr-vert">' +
      escapeHtml(parts.join('　')) +
      '</p>' +
      '</aside>'
    );
  }

  function renderScenes() {
    if (!root || !scenes.length) return;
    root.innerHTML = scenes
      .map((s, i) => {
        const flip = i % 2 === 1 ? ' fr-scene--flip' : '';
        const eager = i === 0 ? ' fetchpriority="high"' : ' loading="lazy"';
        const storyHtml = (s.story || [])
          .map((p) => '<p>' + escapeHtml(p) + '</p>')
          .join('');
        const nn = String(s.n).padStart(2, '0');
        const aside = asideNarration(s);
        return (
          '<article class="fr-scene' +
          flip +
          '" id="scene-' +
          s.n +
          '" data-reveal>' +
          '<div class="fr-scene__story">' +
          '<header class="fr-scene__head">' +
          '<span class="fr-scene__num">第 ' +
          nn +
          ' 幕</span>' +
          '<h3 class="fr-scene__title">' +
          escapeHtml(s.title) +
          '</h3>' +
          '</header>' +
          '<div class="fr-scene__prose">' +
          storyHtml +
          '</div>' +
          '</div>' +
          '<div class="fr-scene__visual">' +
          '<figure class="fr-scene__figure">' +
          '<img src="img/' +
          s.n +
          '.jpg" alt="第 ' +
          s.n +
          ' 页 · ' +
          escapeHtml(s.title) +
          '" width="2000" height="1504" decoding="async"' +
          eager +
          '>' +
          '</figure>' +
          aside +
          '</div>' +
          '</article>'
        );
      })
      .join('');
  }

  function renderToc() {
    if (!toc || !scenes.length) return;
    toc.innerHTML =
      '<ol class="fr-toc__list">' +
      scenes
        .map((s) => {
          const nn = String(s.n).padStart(2, '0');
          return (
            '<li>' +
            '<a class="fr-toc__item" href="#scene-' +
            s.n +
            '">' +
            '<span class="fr-toc__n">' +
            nn +
            '</span>' +
            '<span class="fr-toc__t">' +
            escapeHtml(s.title) +
            '</span>' +
            '</a>' +
            '</li>'
          );
        })
        .join('') +
      '</ol>';
  }

  renderScenes();
  renderToc();

  /* 轻量飘落 */
  const canvas = document.getElementById('fr-canvas');
  if (canvas && !reduced) {
    const ctx = canvas.getContext('2d');
    let w = 0;
    let h = 0;
    const petals = [];
    const N = 24;

    function resize() {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    }

    function spawn(i) {
      petals[i] = {
        x: Math.random() * w,
        y: Math.random() * h,
        r: 2 + Math.random() * 4,
        vx: -0.15 + Math.random() * 0.3,
        vy: 0.25 + Math.random() * 0.45,
        a: Math.random() * Math.PI * 2,
        va: 0.01 + Math.random() * 0.02,
        hue: Math.random() > 0.55 ? '255,186,140' : '255,230,210',
      };
    }

    function tick() {
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < N; i++) {
        const p = petals[i];
        p.x += p.vx + Math.sin(p.a) * 0.2;
        p.y += p.vy;
        p.a += p.va;
        if (p.y > h + 10 || p.x < -10 || p.x > w + 10) spawn(i);
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.a);
        ctx.fillStyle = 'rgba(' + p.hue + ',0.4)';
        ctx.beginPath();
        ctx.ellipse(0, 0, p.r * 1.4, p.r * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      requestAnimationFrame(tick);
    }

    resize();
    for (let i = 0; i < N; i++) spawn(i);
    window.addEventListener('resize', resize);
    requestAnimationFrame(tick);
  }

  const reveals = document.querySelectorAll('[data-reveal]');
  if (reveals.length) {
    if (reduced || !('IntersectionObserver' in window)) {
      reveals.forEach((el) => el.classList.add('is-visible'));
    } else {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((en) => {
            if (en.isIntersecting) {
              en.target.classList.add('is-visible');
              io.unobserve(en.target);
            }
          });
        },
        { threshold: 0.08, rootMargin: '0px 0px -6% 0px' },
      );
      reveals.forEach((el) => io.observe(el));
    }
  }
})();
