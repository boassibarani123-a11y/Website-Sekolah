import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

// Physical ID card size requested: 88 x 56 mm. Used for crisp, print-ready PDF.
const CARD_W_MM = 88;
const CARD_H_MM = 56;

// Render a DOM node to a high-resolution canvas.
async function captureEl(el, scale = 3) {
  if (!el) throw new Error("Elemen kartu tidak ditemukan");
  const canvas = await html2canvas(el, {
    scale,
    backgroundColor: null,
    useCORS: true,
    allowTaint: true,
    logging: false,
  });
  return canvas;
}

// Flatten a (possibly transparent) canvas onto a white background and return a JPEG data URL.
function toJpegUrl(canvas, quality = 0.95) {
  const out = document.createElement("canvas");
  out.width = canvas.width;
  out.height = canvas.height;
  const ctx = out.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.drawImage(canvas, 0, 0);
  return out.toDataURL("image/jpeg", quality);
}

function triggerDownload(dataUrl, filename) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

// Download one or two card sides stacked vertically into a single JPG image.
export async function downloadCardJpg(els, filename = "kartu.jpg", scale = 3) {
  const nodes = (Array.isArray(els) ? els : [els]).filter(Boolean);
  if (!nodes.length) throw new Error("Tidak ada kartu untuk diunduh");
  const canvases = [];
  for (const n of nodes) canvases.push(await captureEl(n, scale));

  const gap = 24;
  const width = Math.max(...canvases.map((c) => c.width));
  const height = canvases.reduce((s, c) => s + c.height, 0) + gap * (canvases.length - 1);

  const out = document.createElement("canvas");
  out.width = width;
  out.height = height;
  const ctx = out.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  let y = 0;
  for (const c of canvases) {
    ctx.drawImage(c, (width - c.width) / 2, y);
    y += c.height + gap;
  }
  triggerDownload(out.toDataURL("image/jpeg", 0.95), filename);
}

// Download one or two card sides as a print-ready PDF (one card per page, real card size).
export async function downloadCardPdf(els, filename = "kartu.pdf", scale = 3) {
  const nodes = (Array.isArray(els) ? els : [els]).filter(Boolean);
  if (!nodes.length) throw new Error("Tidak ada kartu untuk diunduh");
  const pdf = new jsPDF({ unit: "mm", format: [CARD_W_MM, CARD_H_MM], orientation: "landscape" });
  for (let i = 0; i < nodes.length; i++) {
    const canvas = await captureEl(nodes[i], scale);
    if (i > 0) pdf.addPage([CARD_W_MM, CARD_H_MM], "landscape");
    pdf.addImage(toJpegUrl(canvas), "JPEG", 0, 0, CARD_W_MM, CARD_H_MM);
  }
  pdf.save(filename);
}

// Safe filename from a student name / class.
export function cardFilename(student, ext) {
  const base = (student?.name || "kartu").toString().trim().replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return `Kartu_${base || "pelajar"}.${ext}`;
}

// Download a full A4 sheet node (e.g. bulk print layout) as a multi-page A4 PDF.
export async function downloadSheetPdf(el, filename = "kartu_massal.pdf", scale = 2) {
  if (!el) throw new Error("Lembar kartu tidak ditemukan");
  const canvas = await captureEl(el, scale);
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageW = 210;
  const pageH = 297;
  const imgH = (canvas.height * pageW) / canvas.width; // scaled height in mm
  let heightLeft = imgH;
  let position = 0;
  const imgData = toJpegUrl(canvas);
  pdf.addImage(imgData, "JPEG", 0, position, pageW, imgH);
  heightLeft -= pageH;
  while (heightLeft > 0) {
    position -= pageH;
    pdf.addPage("a4", "portrait");
    pdf.addImage(imgData, "JPEG", 0, position, pageW, imgH);
    heightLeft -= pageH;
  }
  pdf.save(filename);
}

// Download a single node as a JPG image (white background).
export async function downloadNodeJpg(el, filename = "kartu.jpg", scale = 2) {
  if (!el) throw new Error("Lembar kartu tidak ditemukan");
  const canvas = await captureEl(el, scale);
  triggerDownload(toJpegUrl(canvas), filename);
}
