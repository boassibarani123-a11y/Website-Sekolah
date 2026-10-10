import { useCallback } from "react";
import { toast } from "sonner";
import api from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";

const DELETE_ROLES = ["super_admin", "admin_absensi"];

// Hapus riwayat absensi hari ini (per siswa / semua) — khusus Super Admin & Admin Absensi.
export function useAttendanceDelete(reload) {
  const { user } = useAuth();
  const canDelete = !!user && DELETE_ROLES.includes(user.role);
  const removeOne = useCallback(async (row) => {
    if (!window.confirm(`Hapus riwayat absensi ${row.student_name} hari ini?\nSiswa bisa scan ulang setelah dihapus.`)) return;
    try {
      const r = await api.delete(`/attendance/${row.id}`);
      toast.success(r.data?.offline ? "Penghapusan disimpan offline, dikirim saat online" : `Riwayat ${row.student_name} dihapus`);
      reload();
    } catch (e) { toast.error(e.response?.data?.detail || "Gagal menghapus"); }
  }, [reload]);
  const removeAll = useCallback(async (count) => {
    if (!count) return toast.info("Belum ada riwayat hari ini");
    if (!window.confirm(`Hapus SEMUA ${count} riwayat absensi hari ini?\nTindakan ini tercatat di log aktivitas dan tidak bisa dibatalkan.`)) return;
    if (window.prompt('Ketik "HAPUS" untuk konfirmasi') !== "HAPUS") return toast.info("Dibatalkan");
    try {
      const r = await api.delete("/attendance/today/all");
      toast.success(r.data?.offline ? "Penghapusan disimpan offline" : `${r.data.deleted} riwayat absensi hari ini dihapus`);
      reload();
    } catch (e) { toast.error(e.response?.data?.detail || "Gagal menghapus"); }
  }, [reload]);
  return canDelete ? { removeOne, removeAll } : null;
}
