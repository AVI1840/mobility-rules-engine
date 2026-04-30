import pymupdf
import os
import sys

files = [
    ("תדריך נייידות.pdf", "extracted_tadrich.txt"),
    ("מחשבון ניידות.pdf", "extracted_machshevon.txt"),
]

for pdf_path, out_path in files:
    if not os.path.exists(pdf_path):
        print(f"SKIP: {pdf_path} not found")
        continue
    try:
        doc = pymupdf.open(pdf_path)
        text = ""
        for page_num, page in enumerate(doc):
            text += f"\n=== PAGE {page_num + 1} ===\n"
            text += page.get_text()
        doc.close()
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(text)
        print(f"OK: {pdf_path} -> {out_path} ({len(text)} chars)")
    except Exception as e:
        print(f"ERROR: {pdf_path}: {e}")
