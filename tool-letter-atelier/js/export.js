/**
 * 见君信笺 · 导出 PDF / PNG
 * 图片信纸模式：背景图 + 文字单层 html2canvas 抓拍，无需边纹合成。
 */
(function (global) {
    const PIXEL_RATIO = 2;

    function fileStamp() {
        const d = new Date();
        const p = (n) => String(n).padStart(2, '0');
        return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes());
    }

    function showOverlay(message) {
        const overlay = document.getElementById('la-export-overlay');
        const status = document.getElementById('la-export-status');
        if (status) status.textContent = message || '正在生成信笺…';
        if (overlay) overlay.hidden = false;
    }

    function hideOverlay() {
        const overlay = document.getElementById('la-export-overlay');
        if (overlay) overlay.hidden = true;
    }

    function getLetterPages(rootEl) {
        if (!rootEl) return [];
        if (rootEl.classList && rootEl.classList.contains('la-letter-stack')) {
            return Array.prototype.slice.call(rootEl.querySelectorAll('.la-letter'));
        }
        if (rootEl.classList && rootEl.classList.contains('la-letter')) {
            return [rootEl];
        }
        return [];
    }

    function pxToMm(px) {
        return (px * 25.4) / 96;
    }

    function extractBackgroundUrl(letterEl) {
        const bg = letterEl && letterEl.style && letterEl.style.backgroundImage;
        if (bg && bg !== 'none') {
            const match = bg.match(/url\(["']?([^"')]+)["']?\)/);
            if (match) return match[1];
        }
        const computed = letterEl ? getComputedStyle(letterEl).backgroundImage : '';
        if (computed && computed !== 'none') {
            const match = computed.match(/url\(["']?([^"')]+)["']?\)/);
            if (match) return match[1];
        }
        return '';
    }

    function waitForBackground(url) {
        if (!url) return Promise.resolve();
        return new Promise(function (resolve) {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            const done = function () {
                clearTimeout(timer);
                resolve();
            };
            img.onload = done;
            img.onerror = done;
            img.src = url;
            const timer = setTimeout(done, 8000);
        });
    }

    function injectCloneStyles(clonedDoc, fontId) {
        if (!clonedDoc || !clonedDoc.head || !global.LA_FONTS) return;
        const fontCss = global.LA_FONTS.buildExportFontCss(fontId);
        if (!fontCss) return;
        const style = clonedDoc.createElement('style');
        style.textContent = fontCss;
        clonedDoc.head.appendChild(style);
    }

    function resetPreviewTransform(scaler, desk) {
        const saved = {
            transform: scaler ? scaler.style.transform : '',
            marginBottom: scaler ? scaler.style.marginBottom : '',
            deskScroll: desk ? desk.scrollTop : 0,
        };
        if (scaler) {
            scaler.style.transform = '';
            scaler.style.marginBottom = '';
        }
        if (desk) desk.scrollTop = 0;
        return saved;
    }

    function restorePreviewTransform(scaler, desk, saved) {
        if (!saved) return;
        if (scaler) {
            scaler.style.transform = saved.transform;
            scaler.style.marginBottom = saved.marginBottom;
        }
        if (desk) desk.scrollTop = saved.deskScroll;
    }

    async function prepareLetterForCapture(letterEl) {
        const fontId = global.LA_FONTS ? global.LA_FONTS.resolveFontId(letterEl) : 'kaiti';
        const size =
            parseFloat(getComputedStyle(letterEl).getPropertyValue('--la-letter-size')) ||
            parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--la-letter-size')) ||
            20;

        if (global.LA_FONTS) {
            await global.LA_FONTS.ensureLoaded(fontId);
            global.LA_FONTS.applyForExport(letterEl, fontId, size);
        }
        if (document.fonts && document.fonts.ready) {
            await document.fonts.ready;
        }

        await waitForBackground(extractBackgroundUrl(letterEl));

        await new Promise(function (resolve) {
            requestAnimationFrame(function () {
                requestAnimationFrame(resolve);
            });
        });
    }

    async function captureLetterCanvas(letterEl, width, height, fontId, sizePx) {
        if (typeof global.html2canvas !== 'function') {
            throw new Error('html2canvas 未加载');
        }

        const stage = document.createElement('div');
        stage.className = 'la-export-capture-stage';
        stage.setAttribute('aria-hidden', 'true');
        stage.style.cssText =
            'position:fixed;left:-99999px;top:0;z-index:-1;pointer-events:none;overflow:visible;';

        const clone = letterEl.cloneNode(true);
        clone.classList.add('la-letter--capturing');
        clone.style.boxShadow = 'none';
        clone.style.transform = 'none';
        clone.style.margin = '0';
        clone.style.width = width + 'px';
        clone.style.height = height + 'px';

        if (global.LA_FONTS) {
            global.LA_FONTS.applyForExport(clone, fontId, sizePx);
        }

        stage.appendChild(clone);
        document.body.appendChild(stage);

        try {
            return await global.html2canvas(clone, {
                scale: PIXEL_RATIO,
                backgroundColor: null,
                useCORS: true,
                allowTaint: true,
                logging: false,
                imageTimeout: 15000,
                width: width,
                height: height,
                scrollX: 0,
                scrollY: 0,
                onclone: function (clonedDoc, node) {
                    node.classList.add('la-letter--capturing');
                    node.style.boxShadow = 'none';
                    injectCloneStyles(clonedDoc, fontId);
                },
            });
        } finally {
            if (stage.parentNode) stage.parentNode.removeChild(stage);
        }
    }

    async function captureLetter(letterEl) {
        const scaler = letterEl.closest('.la-preview-scaler');
        const desk = letterEl.closest('.la-preview-desk');
        const previewSaved = resetPreviewTransform(scaler, desk);

        letterEl.classList.add('la-letter--capturing');

        try {
            await prepareLetterForCapture(letterEl);

            const width = letterEl.offsetWidth;
            const height = letterEl.offsetHeight;
            const fontId = global.LA_FONTS ? global.LA_FONTS.resolveFontId(letterEl) : 'kaiti';
            const sizePx =
                parseFloat(getComputedStyle(letterEl).getPropertyValue('--la-letter-size')) || 20;

            if (global.LA_FONTS) {
                await global.LA_FONTS.waitForExportFont(fontId, sizePx);
            }

            return await captureLetterCanvas(letterEl, width, height, fontId, sizePx);
        } finally {
            letterEl.classList.remove('la-letter--capturing');
            restorePreviewTransform(scaler, desk, previewSaved);
            if (typeof global.fitPreviewScale === 'function') {
                global.fitPreviewScale();
            }
        }
    }

    function downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        setTimeout(function () {
            URL.revokeObjectURL(url);
        }, 2000);
    }

    function stitchCanvases(canvases, gapPx) {
        gapPx = gapPx || 0;
        const width = Math.max.apply(
            null,
            canvases.map(function (c) {
                return c.width;
            })
        );
        const height =
            canvases.reduce(function (sum, c) {
                return sum + c.height;
            }, 0) +
            gapPx * Math.max(0, canvases.length - 1);

        const merged = document.createElement('canvas');
        merged.width = width;
        merged.height = height;
        const ctx = merged.getContext('2d');

        let offsetY = 0;
        canvases.forEach(function (canvas, index) {
            if (index > 0) offsetY += gapPx;
            const x = Math.round((width - canvas.width) / 2);
            ctx.drawImage(canvas, x, offsetY);
            offsetY += canvas.height;
        });

        return merged;
    }

    async function exportPng(rootEl) {
        const pages = getLetterPages(rootEl);
        if (!pages.length) throw new Error('找不到信纸元素');

        const canvases = [];
        for (let i = 0; i < pages.length; i++) {
            canvases.push(await captureLetter(pages[i]));
        }

        const canvas = pages.length === 1 ? canvases[0] : stitchCanvases(canvases, 24 * PIXEL_RATIO);

        return new Promise(function (resolve, reject) {
            canvas.toBlob(
                function (blob) {
                    if (!blob) {
                        reject(new Error('PNG 生成失败'));
                        return;
                    }
                    downloadBlob(blob, '见君信笺-' + fileStamp() + '.png');
                    resolve();
                },
                'image/png',
                1
            );
        });
    }

    async function exportPdf(rootEl) {
        const pages = getLetterPages(rootEl);
        if (!pages.length) throw new Error('找不到信纸元素');
        if (!global.jspdf || !global.jspdf.jsPDF) {
            throw new Error('jsPDF 未加载');
        }

        let pdf = null;

        for (let i = 0; i < pages.length; i++) {
            const letterEl = pages[i];
            const cssWidth = letterEl.offsetWidth;
            const cssHeight = letterEl.offsetHeight;
            const canvas = await captureLetter(letterEl);
            const wMm = pxToMm(cssWidth);
            const hMm = pxToMm(cssHeight);
            const imgData = canvas.toDataURL('image/png');
            const orientation = wMm >= hMm ? 'landscape' : 'portrait';

            if (!pdf) {
                pdf = new global.jspdf.jsPDF({
                    orientation: orientation,
                    unit: 'mm',
                    format: [wMm, hMm],
                    compress: true,
                });
            } else {
                pdf.addPage([wMm, hMm], orientation);
            }

            pdf.addImage(imgData, 'PNG', 0, 0, wMm, hMm, undefined, 'SLOW');
        }

        pdf.save('见君信笺-' + fileStamp() + '.pdf');
    }

    async function exportLetter(rootEl, format) {
        if (!rootEl) throw new Error('找不到信纸元素');

        const pages = getLetterPages(rootEl);
        const firstBody = pages[0] && pages[0].querySelector('.la-letter__body-flow');
        const hasContent = firstBody && !firstBody.querySelector('.la-letter__para--placeholder');
        if (!hasContent) {
            throw new Error('请先书写正文再导出');
        }

        showOverlay(format === 'pdf' ? '正在生成 PDF…' : '正在生成图片…');

        try {
            if (format === 'png') {
                await exportPng(rootEl);
            } else {
                await exportPdf(rootEl);
            }
        } finally {
            hideOverlay();
        }
    }

    global.LetterExport = {
        exportLetter: exportLetter,
        exportPng: exportPng,
        exportPdf: exportPdf,
    };
})(window);
