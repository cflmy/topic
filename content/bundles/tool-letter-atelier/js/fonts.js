/**
 * 见君信笺 · 正文字体库
 * 系统字体即时生效；艺术字体使用同源单文件 TTF（FontFace 按需加载，每次仅 1 个请求）。
 */
(function (global) {
    /** @type {Record<string, {label:string, group:string, family:string, file?:string, faceName?:string, ruleShift:number, letterSpacing?:string}>} */
    const REGISTRY = {
        kaiti: {
            label: '系统楷体 · 温润',
            group: '温润日常',
            family: "'KaiTi', 'STKaiti', '华文楷体', serif",
            ruleShift: 0.17,
        },
        fangsong: {
            label: '仿宋 · 清秀',
            group: '温润日常',
            family: "'FangSong', 'STFangsong', '仿宋', serif",
            ruleShift: 0.11,
        },
        song: {
            label: '宋体 · 沉静',
            group: '温润日常',
            family: "'Songti SC', 'STSong', 'SimSun', serif",
            ruleShift: 0.15,
        },
        mashanzheng: {
            label: '马善政 · 挥毫泼墨',
            group: '行书飞舞',
            family: "'Ma Shan Zheng', 'KaiTi', cursive",
            file: 'fonts/MaShanZheng.ttf',
            faceName: 'Ma Shan Zheng',
            ruleShift: 0.06,
            letterSpacing: '0.05em',
        },
        longcang: {
            label: '龙藏体 · 行云苍劲',
            group: '行书飞舞',
            family: "'Long Cang', 'KaiTi', cursive",
            file: 'fonts/LongCang.ttf',
            faceName: 'Long Cang',
            ruleShift: 0.07,
            letterSpacing: '0.05em',
        },
        liujianmaocao: {
            label: '刘建毛草 · 狂草飞舞',
            group: '狂放浪漫',
            family: "'Liu Jian Mao Cao', cursive",
            file: 'fonts/LiuJianMaoCao.ttf',
            faceName: 'Liu Jian Mao Cao',
            ruleShift: 0.05,
            letterSpacing: '0.06em',
        },
        zhimangxing: {
            label: '志莽行 · 龙蛇意气',
            group: '狂放浪漫',
            family: "'Zhi Mang Xing', 'Liu Jian Mao Cao', cursive",
            file: 'fonts/ZhiMangXing.ttf',
            faceName: 'Zhi Mang Xing',
            ruleShift: 0.05,
            letterSpacing: '0.07em',
        },
    };

    /** 旧版草稿字体 ID → 新版本地/系统字体 */
    const ALIASES = {
        wenkai: 'kaiti',
        hongxingshu: 'mashanzheng',
        hongleisim: 'mashanzheng',
        slideqiuhong: 'longcang',
        yozai: 'longcang',
        yozaiBold: 'longcang',
        slideyouran: 'longcang',
        hongzhuoshu: 'mashanzheng',
        slidefu: 'mashanzheng',
        mdmdwufeng: 'zhimangxing',
        maoken: 'longcang',
        dongfangdakai: 'mashanzheng',
        riitegaki: 'mashanzheng',
        hanazome: 'longcang',
        dingtalk: 'kaiti',
        longzhu: 'longcang',
        smiley: 'kaiti',
    };

    const TEXT_SELECTOR = '.la-letter__body-flow, .la-letter__sign, .la-letter__date';
    const EXPORT_TEXT_SELECTOR = TEXT_SELECTOR + ', .la-letter__para';
    const LOAD_TIMEOUT_MS = 12000;
    const faceCache = {};
    const loadPromises = {};
    const embedCssCache = {};

    function list() {
        return Object.keys(REGISTRY);
    }

    function get(id) {
        return REGISTRY[id] || REGISTRY.kaiti;
    }

    function normalize(id) {
        if (!id) return 'kaiti';
        if (REGISTRY[id]) return id;
        if (ALIASES[id] && REGISTRY[ALIASES[id]]) return ALIASES[id];
        return 'kaiti';
    }

    function waitForFontFaces() {
        if (!document.fonts || !document.fonts.ready) {
            return Promise.resolve();
        }
        return Promise.race([
            document.fonts.ready,
            new Promise(function (resolve) {
                setTimeout(resolve, LOAD_TIMEOUT_MS);
            }),
        ]);
    }

    function ensureLoaded(id) {
        id = normalize(id);
        const font = get(id);
        if (!font.file || !font.faceName) {
            return Promise.resolve(font);
        }
        if (loadPromises[id]) {
            return loadPromises[id];
        }

        loadPromises[id] = new Promise(function (resolve) {
            if (faceCache[id]) {
                waitForFontFaces().then(function () {
                    resolve(font);
                });
                return;
            }

            if (typeof FontFace === 'undefined') {
                resolve(font);
                return;
            }

            const face = new FontFace(font.faceName, 'url(' + resolveFontUrl(font.file) + ')', {
                style: 'normal',
                weight: '400',
                display: 'swap',
            });

            const timer = setTimeout(function () {
                resolve(font);
            }, LOAD_TIMEOUT_MS);

            face.load()
                .then(function (loadedFace) {
                    document.fonts.add(loadedFace);
                    faceCache[id] = loadedFace;
                    clearTimeout(timer);
                    resolve(font);
                })
                .catch(function () {
                    clearTimeout(timer);
                    resolve(font);
                });
        });

        return loadPromises[id];
    }

    function letterTargets(rootEl) {
        if (!rootEl) return [];
        if (rootEl.classList && rootEl.classList.contains('la-letter-stack')) {
            return Array.prototype.slice.call(rootEl.querySelectorAll('.la-letter'));
        }
        if (rootEl.classList && rootEl.classList.contains('la-letter-measure')) {
            return Array.prototype.slice.call(rootEl.querySelectorAll('.la-letter'));
        }
        if (rootEl.classList && rootEl.classList.contains('la-letter')) {
            return [rootEl];
        }
        return [rootEl];
    }

    function resolveFontUrl(file) {
        if (!file) return '';
        try {
            return new URL(file, global.location.href).href;
        } catch (e) {
            return file;
        }
    }

    function exportFamily(fontId) {
        const font = get(normalize(fontId));
        if (font.faceName) {
            return "'" + font.faceName + "'";
        }
        return font.family;
    }

    function buildExportFontCss(fontId) {
        fontId = normalize(fontId);
        const font = get(fontId);
        if (!font.file || !font.faceName) {
            return '';
        }
        if (embedCssCache[fontId]) {
            return embedCssCache[fontId];
        }
        const url = resolveFontUrl(font.file);
        const name = font.faceName;
        embedCssCache[fontId] =
            "@font-face{font-family:'" +
            name +
            "';src:url('" +
            url +
            "') format('truetype');font-weight:400;font-style:normal;font-display:block;}" +
            '.la-letter__body-flow,.la-letter__para,.la-letter__sign,.la-letter__date{font-family:\'' +
            name +
            "' !important;}";
        return embedCssCache[fontId];
    }

    async function waitForExportFont(fontId, sizePx) {
        fontId = normalize(fontId);
        const font = get(fontId);
        await ensureLoaded(fontId);
        if (!document.fonts) {
            return font;
        }
        if (font.faceName) {
            const spec = Math.round(sizePx || 20) + 'px "' + font.faceName + '"';
            try {
                await document.fonts.load(spec);
            } catch (e) {
                /* 部分浏览器 load 可能 reject，仍继续导出 */
            }
        }
        await waitForFontFaces();
        return font;
    }

    function resolveFontId(letterEl) {
        if (!letterEl) return 'kaiti';
        if (letterEl.dataset && letterEl.dataset.font) {
            return normalize(letterEl.dataset.font);
        }
        const stack = letterEl.closest('.la-letter-stack');
        if (stack && stack.dataset && stack.dataset.font) {
            return normalize(stack.dataset.font);
        }
        return 'kaiti';
    }

    function applyForExport(letterEl, fontId, sizePx) {
        const id = normalize(fontId || resolveFontId(letterEl));
        const font = applyTo(letterEl, id, sizePx);
        const family = exportFamily(id);

        function paint(root) {
            root.style.setProperty('--la-font-hand-active', family);
            root.dataset.font = id;
            root.querySelectorAll(EXPORT_TEXT_SELECTOR).forEach(function (node) {
                node.style.fontFamily = family;
            });
        }

        letterTargets(letterEl).forEach(paint);
        if (!letterTargets(letterEl).length) {
            paint(letterEl);
        }

        return font;
    }

    function applyTo(letterEl, fontId, sizePx) {
        const font = get(normalize(fontId));
        if (!letterEl) return font;

        const stack = font.family;
        const shift = (font.ruleShift || 0.13) * (sizePx || 20);
        const shiftPx = Math.round(shift * 100) / 100 + 'px';
        const spacing = font.letterSpacing || '0.04em';
        const fontIdNorm = normalize(fontId);

        letterEl.style.setProperty('--la-font-hand-active', stack);
        letterEl.style.setProperty('--la-letter-spacing', spacing);
        letterEl.style.setProperty('--la-rule-shift', shiftPx);
        if (letterEl.dataset) letterEl.dataset.font = fontIdNorm;

        letterTargets(letterEl).forEach(function (page) {
            page.style.setProperty('--la-font-hand-active', stack);
            page.style.setProperty('--la-letter-spacing', spacing);
            page.style.setProperty('--la-rule-shift', shiftPx);
            page.dataset.font = fontIdNorm;
            page.querySelectorAll(TEXT_SELECTOR).forEach(function (node) {
                node.style.fontFamily = stack;
            });
        });

        if (!letterTargets(letterEl).length) {
            letterEl.querySelectorAll(TEXT_SELECTOR).forEach(function (node) {
                node.style.fontFamily = stack;
            });
        }

        return font;
    }

    global.LA_FONTS = {
        list: list,
        get: get,
        normalize: normalize,
        ensureLoaded: ensureLoaded,
        applyTo: applyTo,
        applyForExport: applyForExport,
        exportFamily: exportFamily,
        buildExportFontCss: buildExportFontCss,
        waitForExportFont: waitForExportFont,
        resolveFontId: resolveFontId,
        resolveFontUrl: resolveFontUrl,
        groups: ['温润日常', '行书飞舞', '狂放浪漫'],
    };
})(typeof window !== 'undefined' ? window : globalThis);
