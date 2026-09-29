/**
 * 见君信笺 · 图片信纸模板
 * 支持竖版（左右裁边拼接）与横版（原图横排）两种方向。
 */
(function (global) {
    const DEFAULT_WING_RATIO = 0.30;
    const PORTRAIT_EXPORT_W = 1200;
    const PORTRAIT_EXPORT_H = 1697;
    const PORTRAIT_RATIO = 1.414;
    const LANDSCAPE_RATIO = 1 / PORTRAIT_RATIO;
    const stitchedUrlCache = Object.create(null);

    let customUrl = '';
    let activeOrientation = 'portrait';

    /** @type {Array<object>} */
    const BUILTIN = [
        {
            id: 'rose-garden',
            name: '玫瑰花园',
            image: 'img/templates/rose-garden.webp',
            imageLandscape: 'img/templates/rose-garden-landscape.webp',
            safe: { top: 15, right: 10, bottom: 13, left: 10 },
            safeLandscape: { top: 11, right: 14, bottom: 10, left: 14 },
            ink: '#3d2a30',
            muted: '#7a5868',
        },
        {
            id: 'blush-lace',
            name: '浅粉蕾丝',
            image: 'img/templates/blush-lace.webp',
            imageLandscape: 'img/templates/blush-lace-landscape.webp',
            safe: { top: 15, right: 11, bottom: 13, left: 11 },
            safeLandscape: { top: 11, right: 14, bottom: 10, left: 14 },
            ink: '#4a2838',
            muted: '#8a5068',
        },
        {
            id: 'cream-floral',
            name: '奶油花卉',
            image: 'img/templates/cream-floral.webp',
            imageLandscape: 'img/templates/cream-floral-landscape.webp',
            safe: { top: 13, right: 11, bottom: 12, left: 11 },
            safeLandscape: { top: 10, right: 13, bottom: 10, left: 13 },
            ink: '#4a3828',
            muted: '#7a6550',
        },
        {
            id: 'xuan-paper',
            name: '宣纸素简',
            image: 'img/templates/xuan-paper.webp',
            imageLandscape: 'img/templates/xuan-paper-landscape.webp',
            safe: { top: 12, right: 10, bottom: 11, left: 10 },
            safeLandscape: { top: 10, right: 12, bottom: 9, left: 12 },
            ink: '#3a3028',
            muted: '#6a5a48',
        },
        {
            id: 'ink-wash',
            name: '水墨淡彩',
            image: 'img/templates/ink-wash.webp',
            imageLandscape: 'img/templates/ink-wash-landscape.webp',
            safe: { top: 15, right: 12, bottom: 14, left: 12 },
            safeLandscape: { top: 12, right: 14, bottom: 11, left: 14 },
            ink: '#2a2820',
            muted: '#5a5048',
        },
    ];

    function normalizeOrientation(value) {
        return value === 'landscape' ? 'landscape' : 'portrait';
    }

    function setOrientation(value) {
        activeOrientation = normalizeOrientation(value);
    }

    function getOrientation() {
        return activeOrientation;
    }

    function list() {
        return BUILTIN.map(function (t) {
            return t.id;
        });
    }

    function resolveView(base, orientation) {
        const orient = normalizeOrientation(orientation || activeOrientation);
        const isLandscape = orient === 'landscape';
        return {
            id: base.id,
            name: base.name,
            image: isLandscape ? base.imageLandscape || base.image : base.image,
            safe: isLandscape
                ? base.safeLandscape || base.safe
                : base.safe,
            ratio: isLandscape ? LANDSCAPE_RATIO : PORTRAIT_RATIO,
            orientation: orient,
            ink: base.ink,
            muted: base.muted,
        };
    }

    function get(id, orientation) {
        if (id === 'custom' && customUrl) {
            const orient = normalizeOrientation(orientation || activeOrientation);
            return resolveView(
                {
                    id: 'custom',
                    name: '自定义图片',
                    image: customUrl,
                    imageLandscape: customUrl,
                    safe: { top: 14, right: 11, bottom: 12, left: 11 },
                    safeLandscape: { top: 11, right: 13, bottom: 10, left: 13 },
                    ink: '#3d2a30',
                    muted: '#6a5060',
                },
                orient
            );
        }
        for (let i = 0; i < BUILTIN.length; i++) {
            if (BUILTIN[i].id === id) return resolveView(BUILTIN[i], orientation);
        }
        return resolveView(BUILTIN[0], orientation);
    }

    function normalize(id) {
        if (!id) return BUILTIN[0].id;
        if (id === 'custom' && customUrl) return 'custom';
        if (id === 'rose-vintage') return 'rose-garden';
        return list().indexOf(id) >= 0 ? id : BUILTIN[0].id;
    }

    function resolveImageUrl(template, orientation) {
        const tpl = template && template.image ? template : get(normalize(template), orientation);
        if (!tpl || !tpl.image) return '';
        if (/^https?:\/\//i.test(tpl.image)) {
            return tpl.image;
        }
        try {
            return new URL(tpl.image, global.location.href).href;
        } catch (e) {
            return tpl.image;
        }
    }

    function setCustomUrl(url) {
        customUrl = (url && url.trim()) || '';
        Object.keys(stitchedUrlCache).forEach(function (key) {
            delete stitchedUrlCache[key];
        });
    }

    function getCustomUrl() {
        return customUrl;
    }

    function shouldStitchLandscape(width, height) {
        return width > height * 1.08;
    }

    function stitchLandscapeOnCanvas(img, wingRatio) {
        wingRatio = wingRatio || DEFAULT_WING_RATIO;
        const wing = Math.max(1, Math.floor(img.naturalWidth * wingRatio));
        const stripH = img.naturalHeight;
        const combinedW = wing * 2;

        const patch = document.createElement('canvas');
        patch.width = combinedW;
        patch.height = stripH;
        const pctx = patch.getContext('2d');
        if (!pctx) return '';
        pctx.drawImage(img, 0, 0, wing, stripH, 0, 0, wing, stripH);
        pctx.drawImage(img, img.naturalWidth - wing, 0, wing, stripH, wing, 0, wing, stripH);

        const outW = PORTRAIT_EXPORT_W;
        const outH = PORTRAIT_EXPORT_H;
        const scale = Math.max(outW / combinedW, outH / stripH);
        const drawW = combinedW * scale;
        const drawH = stripH * scale;
        const offX = (outW - drawW) / 2;
        const offY = (outH - drawH) / 2;

        const canvas = document.createElement('canvas');
        canvas.width = outW;
        canvas.height = outH;
        const ctx = canvas.getContext('2d');
        if (!ctx) return '';
        ctx.drawImage(patch, offX, offY, drawW, drawH);
        return canvas.toDataURL('image/jpeg', 0.88);
    }

    function loadStitchedUrl(url, wingRatio) {
        if (!url) return Promise.resolve('');
        const cacheKey = 'p:' + url;
        if (stitchedUrlCache[cacheKey]) return Promise.resolve(stitchedUrlCache[cacheKey]);

        return new Promise(function (resolve) {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = function () {
                let result = url;
                if (shouldStitchLandscape(img.naturalWidth, img.naturalHeight)) {
                    try {
                        result = stitchLandscapeOnCanvas(img, wingRatio) || url;
                    } catch (e) {
                        result = url;
                    }
                }
                stitchedUrlCache[cacheKey] = result;
                resolve(result);
            };
            img.onerror = function () {
                resolve(url);
            };
            img.src = url;
        });
    }

    function applyBackground(el, imageUrl) {
        if (!el || !imageUrl) return;
        el.style.backgroundImage = 'url("' + imageUrl.replace(/"/g, '\\"') + '")';
    }

    function applyTo(rootEl, templateId, orientation) {
        const orient = normalizeOrientation(orientation || activeOrientation);
        const tpl = get(normalize(templateId), orient);
        if (!rootEl || !tpl) return tpl;

        const imageUrl = resolveImageUrl(tpl, orient);
        const targets = [];

        if (rootEl.classList && rootEl.classList.contains('la-letter-stack')) {
            rootEl.dataset.orientation = orient;
            rootEl.querySelectorAll('.la-letter').forEach(function (page) {
                targets.push(page);
            });
        } else if (rootEl.classList && rootEl.classList.contains('la-letter-measure')) {
            rootEl.dataset.orientation = orient;
            const letter = rootEl.querySelector('.la-letter');
            if (letter) targets.push(letter);
        } else if (rootEl.classList && rootEl.classList.contains('la-letter')) {
            targets.push(rootEl);
        } else {
            targets.push(rootEl);
        }

        targets.forEach(function (el) {
            el.classList.add('la-letter--template');
            el.classList.toggle('la-letter--portrait', orient === 'portrait');
            el.classList.toggle('la-letter--landscape', orient === 'landscape');
            el.dataset.template = tpl.id;
            el.dataset.orientation = orient;
            el.style.setProperty('--la-safe-top', tpl.safe.top + '%');
            el.style.setProperty('--la-safe-right', tpl.safe.right + '%');
            el.style.setProperty('--la-safe-bottom', tpl.safe.bottom + '%');
            el.style.setProperty('--la-safe-left', tpl.safe.left + '%');
            el.style.setProperty('--la-template-ratio', String(tpl.ratio));
            el.style.setProperty('--la-ink', tpl.ink);
            el.style.setProperty('--la-ink-light', tpl.muted);
            el.style.setProperty('--la-muted', tpl.muted);
            el.style.setProperty('--la-rule-color', 'rgba(0,0,0,0.06)');
            if (imageUrl) {
                applyBackground(el, imageUrl);
            }
        });

        if (rootEl.dataset && rootEl.classList && rootEl.classList.contains('la-letter-stack')) {
            rootEl.dataset.template = tpl.id;
            rootEl.dataset.orientation = orient;
        }

        if (tpl.id === 'custom' && imageUrl && /^https?:\/\//i.test(imageUrl) && orient === 'portrait') {
            loadStitchedUrl(imageUrl, DEFAULT_WING_RATIO).then(function (stitched) {
                if (!stitched || stitched === imageUrl) return;
                targets.forEach(function (el) {
                    if (el.dataset.template === 'custom' && el.dataset.orientation === 'portrait') {
                        applyBackground(el, stitched);
                    }
                });
            });
        }

        return tpl;
    }

    global.LA_TEMPLATES = {
        list: list,
        get: get,
        normalize: normalize,
        builtin: BUILTIN,
        applyTo: applyTo,
        resolveImageUrl: resolveImageUrl,
        setCustomUrl: setCustomUrl,
        getCustomUrl: getCustomUrl,
        setOrientation: setOrientation,
        getOrientation: getOrientation,
        normalizeOrientation: normalizeOrientation,
        loadStitchedUrl: loadStitchedUrl,
        shouldStitchLandscape: shouldStitchLandscape,
        PORTRAIT_RATIO: PORTRAIT_RATIO,
        LANDSCAPE_RATIO: LANDSCAPE_RATIO,
    };
})(typeof window !== 'undefined' ? window : globalThis);
