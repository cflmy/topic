/**
 * 见君信笺 · 书信分页（按固定页高拆分正文）
 */
(function (global) {
    const PARA_RE = /^<p class="la-letter__para">([\s\S]*)<\/p>$/;

    function escapeHtml(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function wrapPara(innerHtml) {
        return '<p class="la-letter__para">' + innerHtml + '</p>';
    }

    function measureFlowHeight(flowEl, html) {
        flowEl.innerHTML = html || '';
        return flowEl.offsetHeight;
    }

    function getMetrics(measureRoot) {
        const sheet = measureRoot.querySelector('.la-letter__sheet');
        const head = measureRoot.querySelector('.la-letter__head');
        const foot = measureRoot.querySelector('.la-letter__foot');
        const flow = measureRoot.querySelector('.la-letter__body-flow');
        if (!sheet || !head || !foot || !flow) {
            return { singleBodyH: 320, firstBodyH: 380, middleBodyH: 420, lastBodyH: 360 };
        }

        const sheetStyle = getComputedStyle(sheet);
        const padTop = parseFloat(sheetStyle.paddingTop) || 0;
        const padBottom = parseFloat(sheetStyle.paddingBottom) || 0;
        const inner = sheet.clientHeight - padTop - padBottom;
        const headH = head.offsetHeight;
        const footH = foot.offsetHeight;

        return {
            flow: flow,
            singleBodyH: inner - headH - footH,
            firstBodyH: inner - headH,
            middleBodyH: inner,
            lastBodyH: inner - footH,
        };
    }

    function splitParagraph(paraHtml, maxH, flowEl) {
        const match = paraHtml.match(PARA_RE);
        if (!match) {
            return [paraHtml, ''];
        }

        const segments = match[1].split(/<br\s*\/?>/i);
        const fitParts = [];
        let segIndex = 0;

        while (segIndex < segments.length) {
            const tryParts = fitParts.concat(segments[segIndex]);
            const tryHtml = wrapPara(tryParts.join('<br>'));
            if (measureFlowHeight(flowEl, tryHtml) > maxH && fitParts.length > 0) {
                const fit = wrapPara(fitParts.join('<br>'));
                const rest = wrapPara(segments.slice(segIndex).join('<br>'));
                return [fit, rest];
            }
            fitParts.push(segments[segIndex]);
            segIndex++;
        }

        const text = segments.join('\n');
        if (measureFlowHeight(flowEl, paraHtml) <= maxH || text.length < 2) {
            return [paraHtml, ''];
        }

        let lo = 1;
        let hi = text.length;
        let best = 1;
        while (lo <= hi) {
            const mid = Math.floor((lo + hi) / 2);
            const slice = escapeHtml(text.slice(0, mid)).replace(/\n/g, '<br>');
            const tryHtml = wrapPara(slice);
            if (measureFlowHeight(flowEl, tryHtml) <= maxH) {
                best = mid;
                lo = mid + 1;
            } else {
                hi = mid - 1;
            }
        }

        const head = escapeHtml(text.slice(0, best)).replace(/\n/g, '<br>');
        const tail = escapeHtml(text.slice(best)).replace(/\n/g, '<br>');
        const fit = wrapPara(head);
        const rest = tail.trim() ? wrapPara(tail) : '';
        return [fit, rest];
    }

    function fillPage(paragraphs, startIndex, maxH, flowEl) {
        const chunk = [];
        let i = startIndex;

        while (i < paragraphs.length) {
            const candidate = chunk.concat(paragraphs[i]).join('');
            if (measureFlowHeight(flowEl, candidate) <= maxH) {
                chunk.push(paragraphs[i]);
                i++;
                continue;
            }
            if (chunk.length > 0) {
                break;
            }
            const split = splitParagraph(paragraphs[i], maxH, flowEl);
            chunk.push(split[0]);
            if (split[1]) {
                paragraphs[i] = split[1];
            } else {
                i++;
            }
            break;
        }

        return { bodyHtml: chunk.join(''), nextIndex: i };
    }

    function paginateParagraphs(paragraphs, metrics) {
        if (!paragraphs.length) {
            return [{ kind: 'empty', bodyHtml: '' }];
        }

        const flowEl = metrics.flow;
        const allHtml = paragraphs.join('');
        if (measureFlowHeight(flowEl, allHtml) <= metrics.singleBodyH) {
            return [{ kind: 'single', bodyHtml: allHtml }];
        }

        const pages = [];
        let i = 0;

        while (i < paragraphs.length) {
            const isFirst = pages.length === 0;
            const budget = isFirst ? metrics.firstBodyH : metrics.middleBodyH;
            const filled = fillPage(paragraphs, i, budget, flowEl);
            pages.push({ kind: isFirst ? 'first' : 'mid', bodyHtml: filled.bodyHtml });
            i = filled.nextIndex;
        }

        if (pages.length === 1) {
            pages[0].kind = 'single';
            return pages;
        }

        pages[pages.length - 1].kind = 'last';

        while (pages.length > 1) {
            const last = pages[pages.length - 1];
            if (measureFlowHeight(flowEl, last.bodyHtml) <= metrics.lastBodyH) {
                break;
            }
            const overflow = splitParagraph(last.bodyHtml, metrics.lastBodyH, flowEl);
            if (!overflow[1]) {
                break;
            }
            last.bodyHtml = overflow[0];
            pages.push({ kind: 'last', bodyHtml: overflow[1] });
        }

        return pages;
    }

    function headHtml(toVal, dateVal) {
        return (
            '<header class="la-letter__head">' +
            '<p class="la-letter__salute">致 · <span>' +
            escapeHtml(toVal) +
            '</span></p>' +
            '<time class="la-letter__date">' +
            escapeHtml(dateVal) +
            '</time>' +
            '</header>'
        );
    }

    function footHtml(fromVal, toVal) {
        return (
            '<footer class="la-letter__foot">' +
            '<div class="la-letter__sign">' +
            escapeHtml(fromVal) +
            '</div>' +
            '<div class="la-letter__seal" aria-hidden="true"><span>' +
            escapeHtml(toVal.charAt(0) || '君') +
            '</span></div>' +
            '</footer>'
        );
    }

    function bodyHtml(content, placeholder) {
        const inner = content
            ? content
            : '<p class="la-letter__para la-letter__para--placeholder">在左侧书写，信笺将在此呈现……</p>';
        return (
            '<div class="la-letter__body">' +
            '<div class="la-letter__body-rules" aria-hidden="true"></div>' +
            '<div class="la-letter__body-flow">' +
            inner +
            '</div>' +
            '</div>'
        );
    }

    function renderLetterPage(page, index, total, meta) {
        const kind = page.kind;
        const showHead = kind === 'single' || kind === 'first';
        const showFoot = kind === 'single' || kind === 'last';
        const pageLabel = total > 1 ? '<span class="la-letter__page-num">' + (index + 1) + ' / ' + total + '</span>' : '';

        return (
            '<article class="la-letter la-letter--page la-letter--template" data-page="' +
            (index + 1) +
            '" data-page-kind="' +
            kind +
            '">' +
            '<div class="la-letter__sheet">' +
            (showHead ? headHtml(meta.to, meta.date) : '') +
            bodyHtml(page.bodyHtml, meta.placeholder) +
            (showFoot ? footHtml(meta.from, meta.to) : '') +
            pageLabel +
            '</div>' +
            '</article>'
        );
    }

    function build(stackEl, measureEl, options) {
        if (!stackEl || !measureEl) {
            return 0;
        }

        const paragraphs = options.paragraphs || [];
        const meta = {
            to: options.to || '君',
            date: options.date || '',
            from: options.from || '',
            placeholder: options.placeholder,
        };

        const metrics = getMetrics(measureEl);
        const pages = meta.placeholder
            ? [{ kind: 'empty', bodyHtml: '' }]
            : paginateParagraphs(paragraphs.slice(), metrics);

        const html = pages
            .map(function (page, index) {
                return renderLetterPage(page, index, pages.length, meta);
            })
            .join('');

        stackEl.innerHTML = html;
        return pages.length;
    }

    global.LAPaginate = {
        build: build,
        getMetrics: getMetrics,
    };
})(typeof window !== 'undefined' ? window : globalThis);
