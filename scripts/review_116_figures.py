#!/usr/bin/env python3
"""Build a PRIVATE review pack of official PDF pages for the 26 figure questions.

Usage:
    python -m pip install pymupdf requests pillow
    python scripts/review_116_figures.py

No database changes and no publication of figures occur here.
Review each source PDF visually before cropping and enabling questions.
"""
from __future__ import annotations

import json
from pathlib import Path
import requests
import fitz

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "data" / "116-figure-source-manifest.json"
REVIEW = ROOT / "_figure_review"
PDFS = REVIEW / "pdf"
PAGES = REVIEW / "pages"

def download_pdf(name: str, official_url: str) -> Path:
    PDFS.mkdir(parents=True, exist_ok=True)
    target = PDFS / name
    if target.exists() and target.stat().st_size > 10000:
        return target
    sources = [
        official_url,
        "https://raw.githubusercontent.com/JaredSong/levelup-tw/main/source/" + name,
    ]
    errors = []
    for url in sources:
        try:
            response = requests.get(url, timeout=50, headers={"User-Agent": "11800-school-question-review/1.0"})
            response.raise_for_status()
            if not response.content.startswith(b"%PDF-"):
                raise ValueError("download is not a PDF file")
            target.write_bytes(response.content)
            print(f"Downloaded {name} from {url}")
            return target
        except Exception as exc:
            errors.append(f"{url}: {exc}")
    raise RuntimeError("Could not download source PDF:\n" + "\n".join(errors))

def main():
    items = json.loads(MANIFEST.read_text(encoding="utf-8"))["figures"]
    PAGES.mkdir(parents=True, exist_ok=True)
    by_pdf = {}
    for item in items:
        by_pdf.setdefault(item["source_pdf"], []).append(item)
    reviewed = []
    for name, questions in by_pdf.items():
        path = download_pdf(name, questions[0]["source_pdf_url"])
        with fitz.open(path) as doc:
            for q in questions:
                # Source page is metadata from the importer, not a verified PDF offset.
                # Render adjacent pages too so a shifted page offset does not get misidentified.
                hint = int(q["source_page_hint"])
                for one_based in (hint - 1, hint, hint + 1):
                    page_index = one_based - 1
                    if page_index < 0 or page_index >= len(doc):
                        continue
                    label = q["id"].replace("@", "_")
                    out = PAGES / f"{label}__pdf_page_{one_based}.png"
                    if not out.exists():
                        page = doc[page_index]
                        pix = page.get_pixmap(matrix=fitz.Matrix(1.75, 1.75), alpha=False)
                        pix.save(str(out))
                    reviewed.append({"id": q["id"], "source_pdf": name, "candidate_page": one_based, "page_image": str(out.relative_to(ROOT)), "verified": False})
    (REVIEW / "candidate-pages.json").write_text(json.dumps(reviewed, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Prepared {len(reviewed)} candidate full-page screenshots for {len(items)} questions.")
    print("IMPORTANT: pages are candidates. Compare the numbered question and figure visually before cropping or enabling questions.")
    print("Review output: " + str(REVIEW))

if __name__ == "__main__":
    main()
