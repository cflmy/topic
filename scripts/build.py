#!/usr/bin/env python3
"""Build static topic shelf + copy bundles/covers into dist/."""

from __future__ import annotations

import html
import json
import re
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONFIG_DIR = ROOT / "config"
CONTENT_BUNDLES = ROOT / "content" / "bundles"
CONTENT_COVERS = ROOT / "content" / "covers"
STATIC_DIR = ROOT / "static"
TEMPLATE = ROOT / "templates" / "shelf.html"
DIST = ROOT / "dist"

OLD_SHELF_URLS = (
    "https://www.anlian.cyou/topics/",
    "http://www.anlian.cyou/topics/",
    "https://www.anlian.cyou/topics",
)

_TITLE_RE = re.compile(r"<title[^>]*>.*?</title>", re.IGNORECASE | re.DOTALL)
_DESC_RE = re.compile(
    r'<meta\s+[^>]*name=["\']description["\'][^>]*>',
    re.IGNORECASE,
)
_KEYWORDS_RE = re.compile(
    r'<meta\s+[^>]*name=["\']keywords["\'][^>]*>',
    re.IGNORECASE,
)
_HEAD_CLOSE_RE = re.compile(r"</head>", re.IGNORECASE)


def die(msg: str) -> None:
    print(f"error: {msg}", file=sys.stderr)
    sys.exit(1)


def load_json(path: Path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        die(f"missing {path}")
    except json.JSONDecodeError as exc:
        die(f"invalid JSON {path}: {exc}")


def display_summary(topic: dict) -> str:
    summary = (topic.get("summary") or "").strip()
    if summary:
        return summary
    text = (topic.get("metaDescription") or "").strip()
    if len(text) <= 120:
        return text
    return f"{text[:119]}…"


def apply_topic_meta(
    html_text: str,
    *,
    title: str | None = None,
    description: str | None = None,
    keywords: str | None = None,
) -> str:
    result = html_text
    if title:
        safe_title = html.escape(title, quote=True)
        replacement = f"<title>{safe_title}</title>"
        if _TITLE_RE.search(result):
            result = _TITLE_RE.sub(replacement, result, count=1)
        elif _HEAD_CLOSE_RE.search(result):
            result = _HEAD_CLOSE_RE.sub(f"{replacement}\n</head>", result, count=1)
    if description:
        safe_desc = html.escape(description, quote=True)
        meta = f'<meta name="description" content="{safe_desc}">'
        if _DESC_RE.search(result):
            result = _DESC_RE.sub(meta, result, count=1)
        elif _HEAD_CLOSE_RE.search(result):
            result = _HEAD_CLOSE_RE.sub(f"{meta}\n</head>", result, count=1)
    if keywords:
        safe_kw = html.escape(keywords, quote=True)
        meta_kw = f'<meta name="keywords" content="{safe_kw}">'
        if _KEYWORDS_RE.search(result):
            result = _KEYWORDS_RE.sub(meta_kw, result, count=1)
        elif _HEAD_CLOSE_RE.search(result):
            result = _HEAD_CLOSE_RE.sub(f"{meta_kw}\n</head>", result, count=1)
    return result


def rewrite_shelf_links(text: str) -> str:
    for old in OLD_SHELF_URLS:
        text = text.replace(old, "/")
    return text


def cover_paths(topic: dict) -> tuple[str, str]:
    cover = topic.get("cover") or f"{topic['slug']}.webp"
    cover_200 = cover.replace(".webp", "-200.webp")
    return cover, cover_200


def render_books(topics: list[dict]) -> tuple[str, str]:
    if not topics:
        return '<div class="topic-shelf-empty"><p>暂无已发布的专题，敬请期待。</p></div>', ""

    preload = ""
    first = topics[0]
    cover_400, cover_200 = cover_paths(first)
    preload_href = f"/covers/{cover_200}"
    srcset = f"/covers/{cover_200} 200w, /covers/{cover_400} 400w"
    sizes = "(max-width: 576px) 11rem, 12.5rem"
    preload = (
        f'<link rel="preload" as="image" href="{html.escape(preload_href)}" '
        f'imagesrcset="{html.escape(srcset)}" imagesizes="{html.escape(sizes)}" '
        f'fetchpriority="high">'
    )

    items: list[str] = []
    for i, topic in enumerate(topics):
        slug = html.escape(topic["slug"])
        title = html.escape(topic["title"])
        summary = html.escape(display_summary(topic))
        cover_400, cover_200 = cover_paths(topic)
        src = f"/covers/{cover_200}"
        srcset = f"/covers/{cover_200} 200w, /covers/{cover_400} 400w"
        priority = 'fetchpriority="high"' if i == 0 else 'loading="lazy"'
        items.append(
            f"""
            <li class="topic-book-item">
              <a class="topic-book" href="/{slug}/">
                <div class="topic-book__volume" aria-hidden="true">
                  <div class="topic-book__spine">
                    <span class="topic-book__spine-title">{title}</span>
                  </div>
                  <div class="topic-book__cover">
                    <img src="{html.escape(src)}"
                         srcset="{html.escape(srcset)}"
                         sizes="{html.escape(sizes)}"
                         alt="{title} 封面"
                         width="200"
                         height="280"
                         {priority}
                         decoding="async">
                    <div class="topic-book__shine"></div>
                  </div>
                </div>
                <div class="topic-book__info">
                  <h2 class="topic-book__title">{title}</h2>
                  <p class="topic-book__summary">{summary}</p>
                  <span class="topic-book__cta">打开专题</span>
                </div>
              </a>
            </li>
            """.rstrip()
        )
    books = '<ul class="topic-book-grid" role="list">\n' + "\n".join(items) + "\n</ul>"
    return books, preload


def copy_tree(src: Path, dst: Path) -> None:
    if dst.exists():
        shutil.rmtree(dst)
    shutil.copytree(src, dst)


def process_bundle(topic: dict, dest_dir: Path, site_name: str) -> None:
    slug = topic["slug"]
    src = CONTENT_BUNDLES / slug
    if not src.is_dir():
        die(f"bundle missing for slug={slug}: {src}")
    index_src = src / "index.html"
    if not index_src.is_file():
        die(f"bundle index missing: {index_src}")

    copy_tree(src, dest_dir / slug)

    index_path = dest_dir / slug / "index.html"
    text = index_path.read_text(encoding="utf-8")
    text = rewrite_shelf_links(text)
    brand_title = f"{topic['title']} · {site_name}"
    text = apply_topic_meta(
        text,
        title=brand_title,
        description=topic.get("metaDescription") or None,
        keywords=topic.get("metaKeywords") or None,
    )
    index_path.write_text(text, encoding="utf-8")

    # Also rewrite shelf links in other html files if any
    for html_file in (dest_dir / slug).rglob("*.html"):
        if html_file.name == "index.html":
            continue
        body = html_file.read_text(encoding="utf-8")
        new_body = rewrite_shelf_links(body)
        if new_body != body:
            html_file.write_text(new_body, encoding="utf-8")


def main() -> None:
    site = load_json(CONFIG_DIR / "site.json")
    topics_all = load_json(CONFIG_DIR / "topics.json")
    if not isinstance(topics_all, list):
        die("topics.json must be a list")

    published = [t for t in topics_all if t.get("published")]
    published.sort(key=lambda t: (-int(t.get("sortOrder") or 0), t.get("slug") or ""))

    for topic in published:
        slug = topic.get("slug")
        if not slug:
            die("topic missing slug")
        cover, cover_200 = cover_paths(topic)
        if not (CONTENT_COVERS / cover).is_file():
            die(f"cover missing: {CONTENT_COVERS / cover}")
        if not (CONTENT_COVERS / cover_200).is_file():
            die(f"cover-200 missing: {CONTENT_COVERS / cover_200}")
        if not (CONTENT_BUNDLES / slug / "index.html").is_file():
            die(f"bundle index missing for {slug}")

    if DIST.exists():
        shutil.rmtree(DIST)
    DIST.mkdir(parents=True)

    # CSS
    css_src = STATIC_DIR / "css"
    copy_tree(css_src, DIST / "css")

    # Brand / favicon
    brand_src = STATIC_DIR / "brand"
    if brand_src.is_dir():
        copy_tree(brand_src, DIST / "brand")
        favicon = brand_src / "favicon.ico"
        if favicon.is_file():
            shutil.copy2(favicon, DIST / "favicon.ico")

    # Covers
    copy_tree(CONTENT_COVERS, DIST / "covers")

    # Bundles
    for topic in published:
        process_bundle(topic, DIST, site.get("siteName") or "专题书架")

    # Shelf
    books_block, preload_block = render_books(published)
    site_name = site.get("siteName") or "专题书架"
    site_title = html.escape(f"{site_name}")
    tpl = TEMPLATE.read_text(encoding="utf-8")
    page = (
        tpl.replace("{{ site_title }}", site_title)
        .replace("{{ site_name }}", html.escape(site_name))
        .replace("{{ site_tagline }}", html.escape(site.get("siteTagline") or ""))
        .replace(
            "{{ meta_description }}",
            html.escape(site.get("metaDescription") or ""),
        )
        .replace("{{ preload_block }}", preload_block)
        .replace("{{ books_block }}", books_block)
    )
    (DIST / "index.html").write_text(page, encoding="utf-8")

    print(f"built {len(published)} topics → {DIST}")


if __name__ == "__main__":
    main()
