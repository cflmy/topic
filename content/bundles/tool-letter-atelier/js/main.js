/**
 * 见君信笺工具 · 图片信纸模板 + 实时预览
 */
(function () {
    const STORAGE_KEY = 'anlian-tool-letter-draft-v9';

    const els = {
        to: document.getElementById('la-to'),
        from: document.getElementById('la-from'),
        date: document.getElementById('la-date'),
        body: document.getElementById('la-body'),
        size: document.getElementById('la-size'),
        leading: document.getElementById('la-leading'),
        font: document.getElementById('la-font'),
        letterStack: document.getElementById('la-letter-stack'),
        letterMeasure: document.getElementById('la-letter-measure'),
        previewTitle: document.getElementById('la-preview-title'),
        templateGrid: document.getElementById('la-templates'),
        orientRow: document.getElementById('la-orient-row'),
        customImage: document.getElementById('la-custom-image'),
        liveBadge: document.getElementById('la-live-badge'),
        sample: document.getElementById('la-sample'),
        clear: document.getElementById('la-clear'),
        print: document.getElementById('la-print'),
        exportBtn: document.getElementById('la-export'),
        exportFormat: document.getElementById('la-export-format'),
        sizeOut: document.getElementById('la-size-out'),
        leadingOut: document.getElementById('la-leading-out'),
        previewDesk: document.getElementById('la-preview-desk'),
        previewScaler: document.getElementById('la-preview-scaler'),
        tabs: document.querySelectorAll('.la-tab'),
        tabPanels: document.querySelectorAll('.la-tab-panel'),
    };

    const SAMPLE = {
        to: '君',
        from: '一个不敢说爱的人',
        body:
            '见字如晤。\n\n' +
            '写下这封信的时候，窗外有风，我想起许多次与你擦肩的瞬间。那些话到了唇边又咽下，不是不重要，而是太重要。\n\n' +
            '我不敢打扰你的生活，却又忍不住把心事整理整齐，像一封应当被郑重拆开的信。你若读到，便知有人曾这样安静地喜欢你；你若读不到，它也已然替我诚实过一次。\n\n' +
            '愿你平安，愿你所遇皆温柔。',
    };

    let activeTemplateId = 'rose-garden';
    let activeOrientation = 'portrait';

    function escapeHtml(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function formatChineseDate(date) {
        const y = date.getFullYear();
        const m = date.getMonth() + 1;
        const d = date.getDate();
        const digits = '〇一二三四五六七八九';
        const yearStr = String(y).split('').map((ch) => digits[Number(ch)]).join('');
        const monthStr = m < 10 ? digits[m] : m === 10 ? '十' : '十' + digits[m % 10];
        let dayStr;
        if (d < 10) dayStr = digits[d];
        else if (d === 10) dayStr = '十';
        else if (d < 20) dayStr = '十' + digits[d % 10];
        else if (d === 20) dayStr = '二十';
        else if (d < 30) dayStr = '二十' + digits[d % 10];
        else if (d === 30) dayStr = '三十';
        else dayStr = '三十' + digits[d % 10];
        return yearStr + '年' + monthStr + '月' + dayStr + '日';
    }

    function bodyToParagraphs(text) {
        const trimmed = text.trim();
        if (!trimmed) return [];
        return trimmed
            .split(/\n\s*\n+/)
            .map((block) => block.trim())
            .filter(Boolean)
            .map((block) => {
                const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
                const html = escapeHtml(lines.join('\n')).replace(/\n/g, '<br>');
                return '<p class="la-letter__para">' + html + '</p>';
            });
    }

    function getLetterPages() {
        if (!els.letterStack) return [];
        return Array.prototype.slice.call(els.letterStack.querySelectorAll('.la-letter'));
    }

    function getPrimaryLetter() {
        const pages = getLetterPages();
        return pages.length ? pages[0] : els.letterStack;
    }

    function getFont() {
        if (!els.font) return 'kaiti';
        if (window.LA_FONTS) return window.LA_FONTS.normalize(els.font.value);
        return els.font.value || 'kaiti';
    }

    function getTemplate() {
        if (activeTemplateId === 'custom' && window.LA_TEMPLATES && window.LA_TEMPLATES.getCustomUrl()) {
            return 'custom';
        }
        return window.LA_TEMPLATES ? window.LA_TEMPLATES.normalize(activeTemplateId) : 'rose-garden';
    }

    function getOrientation() {
        return window.LA_TEMPLATES
            ? window.LA_TEMPLATES.normalizeOrientation(activeOrientation)
            : activeOrientation === 'landscape'
              ? 'landscape'
              : 'portrait';
    }

    function setOrientation(orient) {
        activeOrientation = orient === 'landscape' ? 'landscape' : 'portrait';
        if (window.LA_TEMPLATES) {
            window.LA_TEMPLATES.setOrientation(activeOrientation);
        }
        if (els.letterStack) els.letterStack.dataset.orientation = activeOrientation;
        if (els.letterMeasure) els.letterMeasure.dataset.orientation = activeOrientation;
        if (els.orientRow) {
            els.orientRow.querySelectorAll('.la-orient-btn').forEach(function (btn) {
                btn.classList.toggle('is-active', btn.dataset.orient === activeOrientation);
            });
        }
    }

    function setTemplate(id) {
        if (id === 'custom') {
            activeTemplateId = 'custom';
        } else if (window.LA_TEMPLATES) {
            activeTemplateId = window.LA_TEMPLATES.normalize(id);
        }
        if (els.letterStack) els.letterStack.dataset.template = getTemplate();
        if (els.templateGrid) {
            els.templateGrid.querySelectorAll('.la-template-card').forEach(function (card) {
                card.classList.toggle('is-active', card.dataset.template === getTemplate());
            });
        }
    }

    function buildFontSelect() {
        if (!els.font || !window.LA_FONTS) return;
        const saved = els.font.value;
        els.font.innerHTML = '';
        window.LA_FONTS.groups.forEach(function (group) {
            const og = document.createElement('optgroup');
            og.label = group;
            window.LA_FONTS.list().forEach(function (id) {
                const meta = window.LA_FONTS.get(id);
                if (meta.group !== group) return;
                const opt = document.createElement('option');
                opt.value = id;
                opt.textContent = meta.label;
                og.appendChild(opt);
            });
            els.font.appendChild(og);
        });
        els.font.value = window.LA_FONTS.normalize(saved || 'kaiti');
    }

    function buildTemplateGrid() {
        if (!els.templateGrid || !window.LA_TEMPLATES) return;

        const orient = getOrientation();
        const cards = window.LA_TEMPLATES.builtin
            .map(function (tpl) {
                const view = window.LA_TEMPLATES.get(tpl.id, orient);
                const imageUrl = window.LA_TEMPLATES.resolveImageUrl(view, orient);
                return (
                    '<button type="button" class="la-template-card" data-template="' +
                    tpl.id +
                    '" title="' +
                    tpl.name +
                    '">' +
                    '<span class="la-template-card__thumb" style="background-image:url(\'' +
                    imageUrl.replace(/'/g, "\\'") +
                    '\')"></span>' +
                    '<span class="la-template-card__name">' +
                    tpl.name +
                    '</span>' +
                    '</button>'
                );
            })
            .join('');

        els.templateGrid.innerHTML =
            cards +
            '<button type="button" class="la-template-card la-template-card--custom" data-template="custom" title="自定义网络图片">' +
            '<span class="la-template-card__thumb la-template-card__thumb--custom" aria-hidden="true">＋</span>' +
            '<span class="la-template-card__name">网络图片</span>' +
            '</button>';

        els.templateGrid.querySelectorAll('.la-template-card').forEach(function (card) {
            card.addEventListener('click', function () {
                const id = card.dataset.template;
                if (id === 'custom' && els.customImage) {
                    els.customImage.focus();
                    if (!els.customImage.value.trim()) return;
                }
                setTemplate(id);
                renderPreview();
            });
        });
    }

    function preloadTemplates() {
        if (!window.LA_TEMPLATES) return;
        window.LA_TEMPLATES.builtin.forEach(function (tpl) {
            ['portrait', 'landscape'].forEach(function (orient) {
                const view = window.LA_TEMPLATES.get(tpl.id, orient);
                const img = new Image();
                img.src = window.LA_TEMPLATES.resolveImageUrl(view, orient);
            });
        });
    }

    function applyTemplateToPreview() {
        if (!window.LA_TEMPLATES) return null;
        const templateId = getTemplate();
        const orient = getOrientation();
        const tpl = window.LA_TEMPLATES.applyTo(els.letterStack, templateId, orient);

        if (els.letterMeasure) {
            window.LA_TEMPLATES.applyTo(els.letterMeasure, templateId, orient);
        }

        document.documentElement.style.setProperty('--la-ink', tpl.ink);
        document.documentElement.style.setProperty('--la-ink-light', tpl.muted);
        document.documentElement.style.setProperty('--la-muted', tpl.muted);
        document.documentElement.style.setProperty('--la-rule-color', 'rgba(0,0,0,0.06)');
        document.documentElement.style.setProperty('--la-seal-bg', 'rgba(255,255,255,0.35)');
        document.documentElement.style.setProperty('--la-seal-border', tpl.muted);

        return tpl;
    }

    function syncTypography() {
        if (!els.letterStack) return;
        const size = parseFloat(els.size.value) || 20;
        const leading = parseFloat(els.leading.value) || 2.35;
        const lineHeight = Math.round(size * leading * 100) / 100;
        const targets = [els.letterStack];
        if (els.letterMeasure) targets.push(els.letterMeasure);

        targets.forEach(function (root) {
            root.style.setProperty('--la-letter-size', size + 'px');
            root.style.setProperty('--la-line-height', lineHeight + 'px');
            root.style.setProperty('--la-letter-leading', String(leading));
        });
    }

    async function applyActiveFont() {
        if (!els.letterStack || !window.LA_FONTS) return;
        const fontId = getFont();
        const size = parseFloat(els.size.value) || 20;
        window.LA_FONTS.applyTo(els.letterStack, fontId, size);
        if (els.letterMeasure) {
            window.LA_FONTS.applyTo(els.letterMeasure, fontId, size);
        }
        try {
            await window.LA_FONTS.ensureLoaded(fontId);
            window.LA_FONTS.applyTo(els.letterStack, fontId, size);
            if (els.letterMeasure) {
                window.LA_FONTS.applyTo(els.letterMeasure, fontId, size);
            }
        } catch (e) {
            /* 字体加载失败时保留 fallback */
        }
    }

    async function renderPreview() {
        const toVal = els.to.value.trim() || '君';
        const fromVal = els.from.value.trim();
        const dateVal = els.date.value.trim() || formatChineseDate(new Date());
        const bodyVal = els.body.value;
        const paragraphs = bodyToParagraphs(bodyVal);
        const isPlaceholder = paragraphs.length === 0;

        if (els.customImage && window.LA_TEMPLATES) {
            window.LA_TEMPLATES.setCustomUrl(els.customImage.value);
            if (els.customImage.value.trim()) {
                activeTemplateId = 'custom';
            }
        }

        setOrientation(getOrientation());
        syncTypography();
        applyTemplateToPreview();
        setTemplate(getTemplate());

        if (window.LA_FONTS) {
            window.LA_FONTS.applyTo(els.letterStack, getFont(), parseFloat(els.size.value) || 20);
            if (els.letterMeasure) {
                window.LA_FONTS.applyTo(els.letterMeasure, getFont(), parseFloat(els.size.value) || 20);
            }
        }
        await applyActiveFont();

        let pageCount = 1;
        if (window.LAPaginate && els.letterStack && els.letterMeasure) {
            pageCount = window.LAPaginate.build(els.letterStack, els.letterMeasure, {
                paragraphs: paragraphs,
                to: toVal,
                date: dateVal,
                from: fromVal,
                placeholder: isPlaceholder,
            });
            applyTemplateToPreview();
            window.LA_FONTS.applyTo(els.letterStack, getFont(), parseFloat(els.size.value) || 20);
        }

        if (els.previewTitle) {
            els.previewTitle.textContent = pageCount > 1 ? '预览 · 共 ' + pageCount + ' 页' : '预览';
        }
        if (els.sizeOut) els.sizeOut.textContent = els.size.value;
        if (els.leadingOut) els.leadingOut.textContent = Number(els.leading.value).toFixed(2).replace(/\.?0+$/, '');

        flashBadge();
        fitPreviewScale();
        saveDraft();
    }

    function fitPreviewScale() {
        if (!els.previewDesk || !els.previewScaler || !els.letterStack) return;
        if (window.matchMedia('(max-width: 820px)').matches) {
            els.previewScaler.style.transform = '';
            els.previewScaler.style.marginBottom = '';
            return;
        }
        els.previewScaler.style.transform = '';
        els.previewScaler.style.marginBottom = '';
        const deskW = els.previewDesk.clientWidth - 16;
        const firstPage = getPrimaryLetter();
        const letterW = firstPage ? firstPage.offsetWidth : els.letterStack.offsetWidth;
        if (!letterW) return;
        const scale = Math.min(1, deskW / letterW);
        const stackH = els.letterStack.offsetHeight;
        if (scale < 0.99) {
            els.previewScaler.style.transform = 'scale(' + scale + ')';
            els.previewScaler.style.marginBottom = stackH * (scale - 1) + 'px';
        } else {
            els.previewScaler.style.marginBottom = '';
        }
    }

    let badgeTimer;
    function flashBadge() {
        if (!els.liveBadge) return;
        els.liveBadge.textContent = '已同步';
        els.liveBadge.classList.remove('is-idle');
        clearTimeout(badgeTimer);
        badgeTimer = setTimeout(function () {
            els.liveBadge.textContent = '实时';
            els.liveBadge.classList.add('is-idle');
        }, 1200);
    }

    function saveDraft() {
        try {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify({
                    to: els.to.value,
                    from: els.from.value,
                    date: els.date.value,
                    body: els.body.value,
                    template: getTemplate(),
                    orientation: getOrientation(),
                    customImage: els.customImage ? els.customImage.value : '',
                    font: getFont(),
                    size: els.size.value,
                    leading: els.leading.value,
                })
            );
        } catch (e) {
            /* ignore */
        }
    }

    function loadDraft() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return false;
            const data = JSON.parse(raw);
            if (data.to) els.to.value = data.to;
            if (data.from) els.from.value = data.from;
            if (data.date) els.date.value = data.date;
            if (data.body) els.body.value = data.body;
            if (data.customImage && els.customImage) els.customImage.value = data.customImage;
            if (window.LA_TEMPLATES && data.customImage) {
                window.LA_TEMPLATES.setCustomUrl(data.customImage);
            }
            if (data.template) activeTemplateId = data.template;
            if (data.orientation) setOrientation(data.orientation);
            if (data.font && els.font) {
                els.font.value = window.LA_FONTS ? window.LA_FONTS.normalize(data.font) : data.font;
            }
            if (data.size) els.size.value = data.size;
            if (data.leading) els.leading.value = data.leading;
            return true;
        } catch (e) {
            return false;
        }
    }

    function bindInputs() {
        [els.to, els.from, els.date, els.body, els.size, els.leading].forEach(function (el) {
            if (!el) return;
            el.addEventListener('input', renderPreview);
        });
        if (els.font) {
            els.font.addEventListener('change', function () {
                if (els.liveBadge) {
                    els.liveBadge.textContent = '加载字体…';
                    els.liveBadge.classList.remove('is-idle');
                }
                renderPreview();
            });
        }
        if (els.orientRow) {
            els.orientRow.querySelectorAll('.la-orient-btn').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    setOrientation(btn.dataset.orient);
                    buildTemplateGrid();
                    renderPreview();
                });
            });
        }
        if (els.customImage) {
            els.customImage.addEventListener('change', function () {
                if (els.customImage.value.trim()) {
                    activeTemplateId = 'custom';
                }
                renderPreview();
            });
            els.customImage.addEventListener('input', function () {
                if (els.customImage.value.trim()) {
                    activeTemplateId = 'custom';
                    setTemplate('custom');
                }
            });
        }
    }

    function bindTabs() {
        els.tabs.forEach(function (tab) {
            tab.addEventListener('click', function () {
                const name = tab.dataset.tab;
                els.tabs.forEach(function (t) {
                    const on = t === tab;
                    t.classList.toggle('is-active', on);
                    t.setAttribute('aria-selected', on ? 'true' : 'false');
                });
                els.tabPanels.forEach(function (panel) {
                    const on = panel.dataset.panel === name;
                    panel.classList.toggle('is-active', on);
                    if (on) panel.removeAttribute('hidden');
                    else panel.setAttribute('hidden', '');
                });
                requestAnimationFrame(fitPreviewScale);
            });
        });
    }

    function bindActions() {
        if (els.sample) {
            els.sample.addEventListener('click', function () {
                els.to.value = SAMPLE.to;
                els.from.value = SAMPLE.from;
                els.body.value = SAMPLE.body;
                if (!els.date.value.trim()) els.date.value = formatChineseDate(new Date());
                renderPreview();
            });
        }

        if (els.clear) {
            els.clear.addEventListener('click', function () {
                if (!confirm('确定清空当前书信内容？')) return;
                els.to.value = '';
                els.from.value = '';
                els.body.value = '';
                els.date.value = formatChineseDate(new Date());
                renderPreview();
            });
        }

        if (els.print) {
            els.print.addEventListener('click', function () {
                window.print();
            });
        }

        if (els.exportBtn) {
            els.exportBtn.addEventListener('click', async function () {
                if (!window.LetterExport) {
                    alert('导出组件尚未加载，请刷新后重试');
                    return;
                }
                els.exportBtn.disabled = true;
                try {
                    await window.LetterExport.exportLetter(els.letterStack, els.exportFormat.value);
                } catch (err) {
                    alert(err.message || '导出失败');
                } finally {
                    els.exportBtn.disabled = false;
                }
            });
        }
    }

    function init() {
        if (!els.letterStack) return;
        buildFontSelect();
        buildTemplateGrid();
        preloadTemplates();
        const restored = loadDraft();
        if (!restored) {
            activeTemplateId = 'rose-garden';
            setOrientation('portrait');
            if (els.date) els.date.value = formatChineseDate(new Date());
        }
        bindInputs();
        bindTabs();
        bindActions();
        renderPreview();
        window.fitPreviewScale = fitPreviewScale;
        window.addEventListener('resize', fitPreviewScale);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
