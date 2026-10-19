import api from "@/lib/apiClient";
import { toast } from "sonner";

export const canDeleteScan = (u) => !!u && ["super_admin", "piket_gerbang"].includes(u.role);

export async function deleteScan(r, kind, reload) {
  if (!window.confirm(`Hapus data scan ${r.student_name} hari ini? Gunakan untuk uji alat.`)) return;
  try { await api.delete(`/attendance/scan-record/${r.id}?kind=${kind}`); toast.success("Data scan dihapus"); reload(); }
  catch (e) { toast.error(e.response?.data?.detail || "Gagal menghapus"); }
}

export async function deleteAllScans(kind, reload) {
  const who = kind === "guru" ? "guru" : "siswa";
  if (!window.confirm(`Hapus SEMUA data scan ${who} hari ini? Tindakan ini tidak bisa dibatalkan.`)) return;
  try { const r = await api.delete(`/attendance/scan-today?kind=${kind}`); toast.success(`${r.data.deleted} data scan dihapus`); reload(); }
  catch (e) { toast.error(e.response?.data?.detail || "Gagal menghapus"); }
}
