import { toJpeg } from "html-to-image";
import { jsPDF } from "jspdf";
import JSZip from "jszip";

const fetchRequestInit = { credentials: "include", cache: "force-cache" };
const nextFrame = () => new Promise(r => requestAnimationFrame(() => setTimeout(r, 0)));

async function renderPage(node, pixelRatio) {
  return toJpeg(node, { quality: 0.88, pixelRatio, backgroundColor: "#ffffff", fetchRequestInit, cacheBust: false,
    style: { margin: "0", boxShadow: "none" } });
}

const ratioFor = (n) => (n > 60 ? 1.6 : 2.2);

function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export async function exportPagesPdf(nodes, filename, onProgress) {
  if (!nodes.length) throw new Error("Tidak ada halaman kartu");
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
  const ratio = ratioFor(nodes.length);
  for (let i = 0; i < nodes.length; i++) {
    onProgress?.(i + 1, nodes.length);
    await nextFrame();
    const img = await renderPage(nodes[i], ratio);
    if (i > 0) pdf.addPage("a4", "portrait");
    pdf.addImage(img, "JPEG", 0, 0, 210, 297, undefined, "FAST");
  }
  saveBlob(pdf.output("blob"), filename);
}

export async function exportPagesJpg(nodes, filename, onProgress) {
  if (!nodes.length) throw new Error("Tidak ada halaman kartu");
  const ratio = ratioFor(nodes.length);
  if (nodes.length === 1) {
    onProgress?.(1, 1);
    const img = await renderPage(nodes[0], ratio);
    saveBlob(await (await fetch(img)).blob(), filename);
    return;
  }
  const zip = new JSZip();
  for (let i = 0; i < nodes.length; i++) {
    onProgress?.(i + 1, nodes.length);
    await nextFrame();
    const img = await renderPage(nodes[i], ratio);
    zip.file(`Halaman_${String(i + 1).padStart(3, "0")}.jpg`, img.split(",")[1], { base64: true });
  }
  saveBlob(await zip.generateAsync({ type: "blob" }), filename);
}
