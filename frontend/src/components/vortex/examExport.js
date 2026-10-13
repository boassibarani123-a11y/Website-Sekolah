import api from "@/lib/apiClient";
import { toast } from "sonner";

export async function downloadExamExport(exam, format) {
  try {
    const r = await api.get(`/exams/${exam.id}/export?format=${format}`, { responseType: "blob" });
    const url = URL.createObjectURL(r.data);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Nilai_${exam.kelas}_${exam.title}.${format}`.replace(/[^\w.-]+/g, "_");
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    toast.success(`Rekap nilai ${format === "pdf" ? "PDF" : "Excel"} diunduh`);
  } catch (e) {
    toast.error(e.response?.status === 403 ? "Anda tidak berhak mengunduh nilai ujian ini" : "Gagal mengunduh rekap nilai");
  }
}

// Server-synced countdown helper: returns seconds left until target ISO (or null)
export const secondsUntil = (iso, offsetMs) => (iso ? Math.max(0, Math.floor((new Date(iso).getTime() - (Date.now() + offsetMs)) / 1000)) : null);
