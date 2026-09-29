/**
 * 见君信笺 · 边纹绘制（将 SVG 着色为 data URL，兼容 html-to-image 导出）
 */
(function (global) {
    const PATTERNS = {
        baroque: { corner: 'svg/baroque-corner.svg', edge: 'svg/baroque-edge-h.svg' },
        rococo: { corner: 'svg/rococo-corner.svg', edge: 'svg/rococo-edge-h.svg' },
        floral: { corner: 'svg/floral-corner.svg', edge: 'svg/floral-edge-h.svg' },
    };

    const svgTextCache = {};
    const coloredCache = {};

    function normalizePattern(pattern) {
        return PATTERNS[pattern] ? pattern : 'baroque';
    }

    function colorizeSvg(svgText, color) {
        return svgText.replace(/currentColor/g, color);
    }

    function svgDataUrl(svgText) {
        return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgText);
    }

    async function loadSvgText(path) {
        if (svgTextCache[path]) return svgTextCache[path];
        const url = (function () {
            try {
                return new URL(path, global.location.href).href;
            } catch (e) {
                return path;
            }
        })();
        const res = await fetch(url);
        if (!res.ok) throw new Error('边纹资源加载失败: ' + path);
        const text = await res.text();
        svgTextCache[path] = text;
        return text;
    }

    async function getAssets(pattern, color) {
        pattern = normalizePattern(pattern);
        const key = pattern + '|' + color;
        if (coloredCache[key]) return coloredCache[key];

        const paths = PATTERNS[pattern];
        const cornerText = colorizeSvg(await loadSvgText(paths.corner), color);
        const edgeText = colorizeSvg(await loadSvgText(paths.edge), color);

        coloredCache[key] = {
            corner: svgDataUrl(cornerText),
            edge: svgDataUrl(edgeText),
        };
        return coloredCache[key];
    }

    function ensureOrnImg(el) {
        let img = el.querySelector('img.la-orn__img');
        if (!img) {
            img = document.createElement('img');
            img.className = 'la-orn__img';
            img.alt = '';
            img.draggable = false;
            img.setAttribute('decoding', 'sync');
            el.appendChild(img);
        }
        return img;
    }

    function paintOrnament(el, assets) {
        if (!el || !assets) return;
        const isEdge = el.classList.contains('la-orn--edge');
        const img = ensureOrnImg(el);
        img.src = isEdge ? assets.edge : assets.corner;
        el.style.maskImage = 'none';
        el.style.webkitMaskImage = 'none';
        el.style.backgroundColor = 'transparent';
        el.style.backgroundImage = 'none';
        el.classList.add('is-painted');
    }

    function paintLetter(letterEl, assets) {
        if (!letterEl || !assets) return;
        letterEl.querySelectorAll('.la-orn').forEach(function (el) {
            paintOrnament(el, assets);
        });
    }

    function resolvePattern(letterEl) {
        if (letterEl && letterEl.dataset && letterEl.dataset.pattern) {
            return normalizePattern(letterEl.dataset.pattern);
        }
        const stack = letterEl && letterEl.closest('.la-letter-stack');
        if (stack && stack.dataset && stack.dataset.pattern) {
            return normalizePattern(stack.dataset.pattern);
        }
        return 'baroque';
    }

    /** html2canvas 对带 transform 的容器内图片渲染不可靠，将翻转移到 img 上 */
    function normalizeOrnamentForRaster(el) {
        if (!el) return;
        const img = el.querySelector('img.la-orn__img');
        if (!img || !img.src) return;

        const computed = getComputedStyle(el);
        const transform = computed.transform;
        const opacity = computed.opacity;

        el.classList.add('is-painted');
        el.style.maskImage = 'none';
        el.style.webkitMaskImage = 'none';
        el.style.backgroundColor = 'transparent';
        el.style.backgroundImage = 'none';
        el.style.overflow = 'visible';

        if (transform && transform !== 'none') {
            img.style.transform = transform;
            img.style.transformOrigin = 'center center';
            el.style.transform = 'none';
        }

        if (opacity && opacity !== '1') {
            img.style.opacity = opacity;
            el.style.opacity = '1';
        }

        img.style.display = 'block';
        img.style.position = 'absolute';
        img.style.inset = '0';
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.maxWidth = 'none';
        img.style.maxHeight = 'none';
        img.style.objectFit = 'fill';
        img.setAttribute('crossorigin', 'anonymous');
    }

    function normalizeLetterForRaster(letterEl) {
        if (!letterEl) return;
        const border = letterEl.querySelector('.la-letter__border');
        if (border) {
            border.style.zIndex = '3';
            border.style.pointerEvents = 'none';
        }
        letterEl.querySelectorAll('.la-orn').forEach(normalizeOrnamentForRaster);
    }

    function copyOrnamentLayout(src, tgt) {
        const cs = getComputedStyle(src);
        tgt.style.position = cs.position;
        tgt.style.top = cs.top;
        tgt.style.right = cs.right;
        tgt.style.bottom = cs.bottom;
        tgt.style.left = cs.left;
        tgt.style.width = cs.width;
        tgt.style.height = cs.height;
        tgt.style.opacity = cs.opacity;
        tgt.style.transform = cs.transform;
    }

    function syncOrnaments(sourceRoot, targetRoot) {
        if (!sourceRoot || !targetRoot) return;

        const sourceOrns = sourceRoot.querySelectorAll('.la-orn');
        const targetOrns = targetRoot.querySelectorAll('.la-orn');

        sourceOrns.forEach(function (src, index) {
            const tgt = targetOrns[index];
            if (!tgt) return;

            const srcImg = src.querySelector('img.la-orn__img');
            if (!srcImg || !srcImg.src) return;

            let tgtImg = tgt.querySelector('img.la-orn__img');
            if (!tgtImg) {
                tgtImg = srcImg.cloneNode(true);
                tgt.appendChild(tgtImg);
            } else {
                tgtImg.src = srcImg.src;
            }

            tgt.className = src.className;
            copyOrnamentLayout(src, tgt);
            normalizeOrnamentForRaster(tgt);
        });
    }

    function syncClone(sourceLetter, targetLetter) {
        if (!sourceLetter || !targetLetter) return;

        targetLetter.dataset.pattern = resolvePattern(sourceLetter);
        syncOrnaments(sourceLetter, targetLetter);
        normalizeLetterForRaster(targetLetter);
    }

    function syncBorderClone(sourceBorder, targetBorder) {
        if (!sourceBorder || !targetBorder) return;
        syncOrnaments(sourceBorder, targetBorder);
        targetBorder.style.zIndex = '3';
        targetBorder.style.pointerEvents = 'none';
    }

    function exportCssText() {
        return (
            '.la-letter{position:relative;}' +
            '.la-letter__border{position:absolute;inset:0;pointer-events:none;z-index:3;}' +
            '.la-orn{position:absolute;overflow:visible;background:transparent !important;}' +
            '.la-orn.is-painted{mask-image:none !important;-webkit-mask-image:none !important;background:none !important;}' +
            '.la-orn--corner{width:calc(var(--la-frame-w, 2.15rem) + 6px);height:calc(var(--la-frame-w, 2.15rem) + 6px);}' +
            '.la-orn--tl{top:2px;left:2px;}' +
            '.la-orn--tr{top:2px;right:2px;}' +
            '.la-orn--bl{bottom:2px;left:2px;}' +
            '.la-orn--br{bottom:2px;right:2px;}' +
            '.la-orn--top,.la-orn--bottom{left:var(--la-frame-w,2.15rem);right:var(--la-frame-w,2.15rem);height:calc(var(--la-frame-w,2.15rem) - 4px);}' +
            '.la-orn--top{top:4px;}.la-orn--bottom{bottom:4px;}' +
            '.la-orn__img{display:block;position:absolute;inset:0;width:100%;height:100%;object-fit:fill;pointer-events:none;}'
        );
    }

    function getOrnamentFlip(el) {
        if (el.classList.contains('la-orn--tr')) return { sx: -1, sy: 1 };
        if (el.classList.contains('la-orn--bl')) return { sx: 1, sy: -1 };
        if (el.classList.contains('la-orn--br')) return { sx: -1, sy: -1 };
        if (el.classList.contains('la-orn--bottom')) return { sx: 1, sy: -1 };
        return { sx: 1, sy: 1 };
    }

    function loadRasterImage(src) {
        return new Promise(function (resolve, reject) {
            const img = new Image();
            img.onload = function () {
                if (!src || src.indexOf('data:image/svg') !== 0) {
                    resolve(img);
                    return;
                }
                const w = img.naturalWidth || img.width || 128;
                const h = img.naturalHeight || img.height || 128;
                const scratch = document.createElement('canvas');
                scratch.width = w;
                scratch.height = h;
                const ctx = scratch.getContext('2d');
                if (!ctx) {
                    resolve(img);
                    return;
                }
                ctx.drawImage(img, 0, 0, w, h);
                const raster = new Image();
                raster.onload = function () {
                    resolve(raster);
                };
                raster.onerror = function () {
                    resolve(img);
                };
                raster.src = scratch.toDataURL('image/png');
            };
            img.onerror = reject;
            img.src = src;
        });
    }

    function getRelativeBox(el, ancestor) {
        let x = 0;
        let y = 0;
        let node = el;

        while (node && node !== ancestor) {
            x += node.offsetLeft;
            y += node.offsetTop;
            node = node.offsetParent;
        }

        if (node !== ancestor) {
            const a = ancestor.getBoundingClientRect();
            const b = el.getBoundingClientRect();
            return {
                x: b.left - a.left,
                y: b.top - a.top,
                w: b.width,
                h: b.height,
            };
        }

        return {
            x: x,
            y: y,
            w: el.offsetWidth,
            h: el.offsetHeight,
        };
    }

    function collectOrnamentLayers(letterEl) {
        const layers = [];

        letterEl.querySelectorAll('.la-orn').forEach(function (orn) {
            const imgEl = orn.querySelector('img.la-orn__img');
            if (!imgEl || !imgEl.src) return;

            const box = getRelativeBox(orn, letterEl);
            if (!box.w || !box.h) return;

            layers.push({
                src: imgEl.src,
                x: box.x,
                y: box.y,
                w: box.w,
                h: box.h,
                flip: getOrnamentFlip(orn),
                opacity: parseFloat(getComputedStyle(orn).opacity) || 1,
            });
        });

        return layers;
    }

    async function compositeOntoCanvas(canvas, letterEl, scale) {
        if (!canvas || !letterEl) return canvas;
        if (!scale) {
            scale = letterEl.offsetWidth ? canvas.width / letterEl.offsetWidth : 1;
        }

        const layers = collectOrnamentLayers(letterEl);
        if (!layers.length) return canvas;

        const ctx = canvas.getContext('2d');
        if (!ctx) return canvas;

        for (let i = 0; i < layers.length; i++) {
            const layer = layers[i];
            let img;
            try {
                img = await loadRasterImage(layer.src);
            } catch (e) {
                continue;
            }

            const x = layer.x * scale;
            const y = layer.y * scale;
            const w = layer.w * scale;
            const h = layer.h * scale;

            ctx.save();
            ctx.globalAlpha = layer.opacity;
            ctx.translate(x + w / 2, y + h / 2);
            ctx.scale(layer.flip.sx, layer.flip.sy);
            ctx.drawImage(img, -w / 2, -h / 2, w, h);
            ctx.restore();
        }

        return canvas;
    }

    function shouldIgnoreForHtml2Canvas(el) {
        if (!el || !el.classList) return false;
        if (el.classList.contains('la-letter__border')) return true;
        if (el.classList.contains('la-orn')) return true;
        if (el.classList.contains('la-orn__img')) return true;
        return false;
    }

    async function paintStack(stackEl, pattern, color) {
        if (!stackEl) return;
        const assets = await getAssets(pattern, color);
        if (stackEl.classList.contains('la-letter-stack')) {
            stackEl.querySelectorAll('.la-letter').forEach(function (letter) {
                paintLetter(letter, assets);
            });
            return;
        }
        paintLetter(stackEl, assets);
    }

    async function preload(pattern) {
        pattern = normalizePattern(pattern);
        const paths = PATTERNS[pattern];
        await Promise.all([loadSvgText(paths.corner), loadSvgText(paths.edge)]);
    }

    global.LAOrnaments = {
        paintStack: paintStack,
        paintLetter: async function (letterEl, pattern, color) {
            const assets = await getAssets(pattern, color);
            paintLetter(letterEl, assets);
        },
        resolvePattern: resolvePattern,
        normalizeLetterForRaster: normalizeLetterForRaster,
        syncClone: syncClone,
        syncBorderClone: syncBorderClone,
        exportCssText: exportCssText,
        compositeOntoCanvas: compositeOntoCanvas,
        shouldIgnoreForHtml2Canvas: shouldIgnoreForHtml2Canvas,
        preload: preload,
    };
})(typeof window !== 'undefined' ? window : globalThis);
