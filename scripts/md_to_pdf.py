#!/usr/bin/env python3
"""Ubah file Markdown sederhana menjadi PDF (judul, paragraf, list, tabel, blok kode).

Pakai: python scripts/md_to_pdf.py INPUT.md OUTPUT.pdf "Judul Header"
"""
import re
import sys
from fpdf import FPDF

FONT = "/usr/share/fonts/truetype/liberation"
NAVY, SKY, GREY, CODEBG, LIGHT = (15, 32, 68), (14, 110, 190), (90, 100, 115), (24, 30, 42), (238, 243, 249)


class PDF(FPDF):
    title_txt = ""

    def header(self):
        if self.page_no() == 1:
            return
        self.set_font("S", "", 8)
        self.set_text_color(*GREY)
        self.cell(0, 8, self.title_txt, align="L")
        self.set_x(-30)
        self.cell(20, 8, f"Hal. {self.page_no()}", align="R")
        self.ln(10)


def inline(t):
    t = re.sub(r"\*\*(.+?)\*\*", r"\1", t)
    t = re.sub(r"`([^`]+)`", r"\1", t)
    t = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r"\1 (\2)", t)
    return t.replace("→", "->").replace("≥", ">=").replace("≤", "<=").replace("–", "-").replace("—", "-").replace("±", "+/-")


def mc(pdf, w, h, txt, **kw):
    pdf.multi_cell(w, h, txt, new_x="LMARGIN", new_y="NEXT", align="L", **kw)


def render(md, out, title):
    pdf = PDF(format="A4")
    pdf.title_txt = title
    for st, f in (("", "Regular"), ("B", "Bold"), ("I", "Italic")):
        pdf.add_font("S", st, f"{FONT}/LiberationSans-{f}.ttf")
    pdf.add_font("M", "", f"{FONT}/LiberationMono-Regular.ttf")
    pdf.set_auto_page_break(True, 15)
    pdf.set_margins(16, 16, 16)
    pdf.add_page()
    W = pdf.w - 32
    lines = md.splitlines()
    i = 0
    first_h1 = True
    while i < len(lines):
        ln = lines[i]
        if ln.startswith("```"):
            code = []
            i += 1
            while i < len(lines) and not lines[i].startswith("```"):
                code.append(lines[i])
                i += 1
            pdf.set_font("M", "", 8)
            pdf.set_fill_color(*CODEBG)
            pdf.set_text_color(230, 235, 240)
            mc(pdf, W, 4.2, inline("\n".join(code)) or " ", fill=True, padding=2)
            pdf.ln(2)
        elif ln.startswith("|") and i + 1 < len(lines) and re.match(r"^\|[\s:|-]+\|$", lines[i + 1].strip()):
            rows = []
            while i < len(lines) and lines[i].startswith("|"):
                if not re.match(r"^\|[\s:|-]+\|$", lines[i].strip()):
                    rows.append([inline(c.strip()).replace("\\|", "|") for c in lines[i].strip().strip("|").split("|")])
                i += 1
            i -= 1
            pdf.set_font("S", "", 8)
            pdf.set_text_color(30, 30, 30)
            with pdf.table(width=W, line_height=4.5, first_row_as_headings=False) as t:
                for r_i, r in enumerate(rows):
                    row = t.row()
                    for c in r:
                        pdf.set_font("S", "B" if r_i == 0 else "", 8)
                        row.cell(c)
            pdf.ln(2)
        elif ln.startswith("# "):
            if not first_h1:
                pdf.add_page()
            first_h1 = False
            pdf.set_font("S", "B", 18)
            pdf.set_text_color(*NAVY)
            mc(pdf, W, 9, inline(ln[2:]))
            pdf.ln(2)
        elif ln.startswith("## "):
            pdf.ln(3)
            pdf.set_font("S", "B", 13)
            pdf.set_text_color(*SKY)
            mc(pdf, W, 7, inline(ln[3:]))
            pdf.ln(1)
        elif ln.startswith("### "):
            pdf.ln(1)
            pdf.set_font("S", "B", 11)
            pdf.set_text_color(*NAVY)
            mc(pdf, W, 6, inline(ln[4:]))
        elif re.match(r"^\s*([-*]|\d+\.)\s", ln):
            m = re.match(r"^(\s*)([-*]|\d+\.)\s(.*)", ln)
            ind = 4 + len(m.group(1)) * 2
            bullet = "•" if m.group(2) in "-*" else m.group(2)
            pdf.set_font("S", "", 9.5)
            pdf.set_text_color(30, 30, 30)
            pdf.set_x(16 + ind)
            mc(pdf, W - ind, 5, f"{bullet} {inline(m.group(3))}")
        elif ln.startswith(">"):
            pdf.set_font("S", "I", 9.5)
            pdf.set_fill_color(*LIGHT)
            pdf.set_text_color(*NAVY)
            mc(pdf, W, 5, inline(ln.lstrip("> ")), fill=True, padding=2)
            pdf.ln(1)
        elif ln.strip() in ("---", ""):
            pdf.ln(2)
        else:
            pdf.set_font("S", "", 9.5)
            pdf.set_text_color(30, 30, 30)
            mc(pdf, W, 5, inline(ln))
        i += 1
    pdf.output(out)


if __name__ == "__main__":
    src, dst = sys.argv[1], sys.argv[2]
    render(open(src, encoding="utf-8").read(), dst, sys.argv[3] if len(sys.argv) > 3 else "")
    print("OK", dst)
