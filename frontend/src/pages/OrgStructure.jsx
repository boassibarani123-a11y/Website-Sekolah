import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Network, Plus, X, Trash2, Users, ArrowRight, GraduationCap, Pencil } from "lucide-react";

const CARD_GRADIENTS = [
  "from-sky-500 to-indigo-600",
  "from-indigo-500 to-violet-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
  "from-rose-500 to-pink-600",
  "from-violet-500 to-fuchsia-600",
];

export default function OrgStructure() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user.role === "super_admin";
  const [structures, setStructures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const load = () => {
    setLoading(true);
    api.get("/org-structures").then(r => setStructures(r.data)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const remove = async (s) => {
    if (!window.confirm(`Hapus struktur "${s.name}" beserta semua anggotanya?`)) return;
    try { await api.delete(`/org-structures/${s.id}`); toast.success("Struktur dihapus"); load(); }
    catch (e) { toast.error(e.response?.data?.detail || "Gagal menghapus"); }
  };

  return (
    <div className="space-y-6" data-testid="org-structure-page">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-3xl font-extrabold text-slate-900 flex items-center gap-2">
            <Network className="w-7 h-7 text-sky-600" />Struktur Organisasi
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Kelola beberapa bagan organisasi terpisah. Setiap bagan memanjang ke bawah tanpa batas.
          </p>
        </div>
        {isAdmin && (
          <button data-testid="create-structure-button" onClick={() => setCreating(true)}
            className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-xl shadow-lg shadow-sky-600/30 flex items-center gap-2">
            <Plus className="w-4 h-4" />Buat Struktur Organisasi Baru
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-slate-400 py-20 text-center">Memuat...</p>
      ) : structures.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center">
          <Network className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="mt-3 text-slate-500 font-medium">Belum ada struktur organisasi.</p>
          {isAdmin && <p className="text-sm text-slate-400">Klik tombol Buat Struktur Organisasi Baru untuk memulai.</p>}
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {structures.map((s, i) => (
            <div key={s.id} data-testid={`structure-card-${s.id}`}
              className="group relative bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer"
              onClick={() => navigate(`/org-structure/${s.id}`)}>
              <div className={`h-24 bg-gradient-to-r ${CARD_GRADIENTS[i % CARD_GRADIENTS.length]} relative`}>
                <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/10" />
                <div className="absolute bottom-3 left-4 w-11 h-11 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center border border-white/30">
                  <GraduationCap className="w-6 h-6 text-white" />
                </div>
                {isAdmin && (
                  <button data-testid={`delete-structure-${s.id}`} onClick={(e) => { e.stopPropagation(); remove(s); }}
                    className="absolute top-3 right-3 p-1.5 rounded-lg bg-black/20 hover:bg-rose-500/80 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-heading font-bold text-slate-900 leading-tight line-clamp-2">{s.name}</h3>
                {s.subtitle && <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{s.subtitle}</p>}
                <div className="mt-3 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                    <Users className="w-3.5 h-3.5" />{s.member_count || 0} anggota
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-sky-600 group-hover:gap-2 transition-all">
                    Buka <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {creating && <CreateStructureModal onClose={() => setCreating(false)}
        onCreated={(s) => { setCreating(false); navigate(`/org-structure/${s.id}`); }} />}
    </div>
  );
}

function CreateStructureModal({ onClose, onCreated }) {
  const [name, setName] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!name.trim()) return toast.error("Nama struktur wajib diisi");
    setBusy(true);
    try {
      const r = await api.post("/org-structures", { name: name.trim(), subtitle: subtitle.trim() || null });
      toast.success("Struktur dibuat — mulai isi anggotanya");
      onCreated(r.data);
    } catch (e) { toast.error(e.response?.data?.detail || "Gagal membuat struktur"); }
    finally { setBusy(false); }
  };
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <h3 className="font-heading text-xl font-bold flex items-center gap-2"><Pencil className="w-5 h-5 text-sky-600" />Struktur Organisasi Baru</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Nama / Judul Struktur *</label>
            <input data-testid="structure-name-input" value={name} onChange={e => setName(e.target.value)}
              placeholder="mis. Struktur Organisasi SMA Negeri 1"
              className="mt-1 w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl focus:border-sky-500 outline-none" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Subjudul (opsional)</label>
            <input data-testid="structure-subtitle-input" value={subtitle} onChange={e => setSubtitle(e.target.value)}
              placeholder="mis. Tahun Ajaran 2025/2026"
              className="mt-1 w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl focus:border-sky-500 outline-none" />
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 py-2.5 border-2 border-slate-200 rounded-xl font-semibold hover:bg-slate-50">Batal</button>
            <button data-testid="save-structure-button" disabled={busy} onClick={save}
              className="flex-1 py-2.5 bg-sky-600 text-white rounded-xl font-semibold hover:bg-sky-700 disabled:opacity-60">
              {busy ? "Membuat..." : "Buat & Isi"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
