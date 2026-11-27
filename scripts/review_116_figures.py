#!/usr/bin/env python3
"""Extract the 26 116-year graphic/code questions as source PDF clips.

The PDF files are downloaded from a public PDF mirror only if their SHA-256
checksums exactly match the four user-supplied original PDF files.
Question-answer annotations at the left margin are excluded from each clip.
Do not change the DB has_figure flags until these assets have been committed.
"""
from __future__ import annotations
import hashlib
import json
import re
from pathlib import Path
from urllib.request import Request, urlopen

import fitz

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "question-figures" / "116"
PDFS = ROOT / "_figure_pdfs"
MANIFEST = ROOT / "data" / "116-figure-source-manifest.json"
CHECKSUMS = {
    "118002A15.pdf": "130aa6862da542af79254460e8b98fa32552f5dc0f51ab661c025d0f135883a9",
    "900110A13.pdf": "d9c18a3d549321f8f44e2ad384f5e8d36943aeb84f306590ae904379e12c0df3",
    "900080A18.pdf": "c93ac428f2cfe02d8a35acd307393a9e075af37821396825d8dad721e787be43",
    "900090A14.pdf": "464a5b6910912a32c5e470b5b77dca0888aff2aa3d0cb29575fa8e6c14d0c5f3",
}
MIRROR = "https://raw.githubusercontent.com/JaredSong/levelup-tw/main/source/"

def load_pdf(name: str) -> Path:
    PDFS.mkdir(exist_ok=True)
    target = PDFS / name
    if not target.exists():
        req = Request(MIRROR + name, headers={"User-Agent": "Mozilla/5.0"})
        with urlopen(req, timeout=60) as response:
            target.write_bytes(response.read())
    content = target.read_bytes()
    if not content.startswith(b"%PDF-"):
        raise RuntimeError(f"{name} is not a valid PDF")
    digest = hashlib.sha256(content).hexdigest()
    if digest != CHECKSUMS[name]:
        raise RuntimeError(f"SHA256 mismatch in {name}. Expected exact original upload hash {CHECKSUMS[name]}; got {digest}")
    return target

def crop(doc: fitz.Document, row: dict) -> dict:
    page_idx = int(row["source_page_hint"]) - 1
    page = doc[page_idx]
    num = int(row["number"])
    matches = []
    anchors = []
    for word in page.get_text("words", sort=True):
        x, y, _, _, text = word[:5]
        if x < 95 and 25 < y < 785 and re.fullmatch(r"\d+\.", text):
            n = int(text[:-1])
            anchors.append((n, y))
            if n == num:
                matches.append(y)
    if not matches:
        raise RuntimeError(f"Question {row['id']} not found on PDF page {page_idx+1}")
    # On PDF p.5, section 03 question 1 and section 04 question 1 coexist.
    y = matches[-1] if row["id"] == "90011-04-001@116" else matches[0]
    following = [a for _, a in anchors if a > y + 3]
    lower = min(following) if following else page.rect.height - 43
    if lower-y < 34:
        raise RuntimeError(f"Unusually short question clip: {row['id']}")
    # Answer keys appear at PDF x~76 or x~90. The original question, diagrams,
    # code blocks and inline answer choices begin at x~110/129.
    clip = fitz.Rect(105, max(25, y-2), page.rect.width-42, min(lower-3, page.rect.height-38))
    if clip.height < 25:
        raise RuntimeError(f"Invalid clip {row['id']}")
    name = row["id"].split("@", 1)[0] + ".png"
    pix = page.get_pixmap(matrix=fitz.Matrix(2.0, 2.0), clip=clip, alpha=False)
    pix.save(str(OUT / name))
    return {"id":row["id"],"file":name,"source_pdf":row["source_pdf"],"page":page_idx+1,
            "clip": [round(v,2) for v in clip],"image_width":pix.width,"image_height":pix.height,
            "sha256":hashlib.sha256((OUT / name).read_bytes()).hexdigest(),
            "question_location_verified":True,"answers_excluded_by_margin":True}

def main():
    rows = json.loads(MANIFEST.read_text(encoding="utf-8"))["figures"]
    if len(rows) != 26:
        raise RuntimeError(f"Expected 26 figures, found {len(rows)}")
    OUT.mkdir(parents=True, exist_ok=True)
    docs = {}
    results = []
    try:
        for row in rows:
            name = row["source_pdf"]
            if name not in docs:
                docs[name] = fitz.open(load_pdf(name))
            results.append(crop(docs[name],row))
    finally:
        for doc in docs.values():
            doc.close()
    if len(list(OUT.glob("*.png"))) != 26:
        raise RuntimeError("Expected exactly 26 PNG files")
    (OUT / "manifest.json").write_text(json.dumps({"source":"original user-supplied PDF files (hash verified)","clips":results},ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(f"Prepared {len(results)} original PDF question clips under {OUT}")

if __name__ == "__main__":
    main()
