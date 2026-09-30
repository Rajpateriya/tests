"""Extract theory chunks from a PDF.

PyMuPDF is used only to detect headings (via font-size heuristics — plain
text extraction carries no heading structure), producing a synthetic
Markdown document. LangChain's `MarkdownHeaderTextSplitter` then does the
actual chunking, so each chunk stays scoped to one heading/section.
"""
from typing import Dict, List

import fitz  # PyMuPDF
from langchain_text_splitters import MarkdownHeaderTextSplitter

HEADING_KEY = "heading"


def _extract_markdown(pdf_bytes: bytes) -> str:
    """Render the PDF's text as Markdown, promoting large/bold spans to '## ' headings."""
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")

    spans: List[Dict] = []
    for page in doc:
        page_dict = page.get_text("dict")
        for block in page_dict.get("blocks", []):
            for line in block.get("lines", []):
                for span in line.get("spans", []):
                    text = span.get("text", "").strip()
                    if text:
                        spans.append({"text": text, "size": span.get("size", 0)})
    doc.close()

    if not spans:
        return ""

    sizes = sorted(s["size"] for s in spans)
    median_size = sizes[len(sizes) // 2]
    heading_threshold = median_size + 1.5

    lines: List[str] = []
    for span in spans:
        is_heading = span["size"] >= heading_threshold and len(span["text"].split()) <= 15
        if is_heading:
            lines.append(f"\n## {span['text']}\n")
        else:
            lines.append(span["text"])

    return " ".join(lines)


def extract_raw_text(pdf_bytes: bytes) -> str:
    """Plain text extraction for PDFs with no exploitable heading structure
    (e.g. PYQ papers), where questions are found by AI-parsing raw text
    rather than by heading-based chunking."""
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    pages = [page.get_text("text") for page in doc]
    doc.close()
    return "\n\n".join(pages)


def extract_theory_chunks(pdf_bytes: bytes, min_words: int = 40) -> List[Dict[str, str]]:
    """Return a list of `{"heading": ..., "text": ...}` chunks from a theory PDF."""
    markdown_text = _extract_markdown(pdf_bytes)
    if not markdown_text.strip():
        return []

    splitter = MarkdownHeaderTextSplitter(headers_to_split_on=[("##", HEADING_KEY)])
    split_docs = splitter.split_text(markdown_text)

    chunks: List[Dict[str, str]] = []
    for doc in split_docs:
        text = doc.page_content.strip()
        if len(text.split()) >= min_words:
            chunks.append(
                {
                    "heading": doc.metadata.get(HEADING_KEY, "General"),
                    "text": text,
                }
            )
    return chunks
