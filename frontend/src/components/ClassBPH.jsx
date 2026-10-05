import { useCallback, useEffect, useRef, useState } from "react";
import api from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Plus, X, Pencil, Upload, User, Lock, Check } from "lucide-react";
import { OrgTree, buildTree } from "@/components/OrgTree";

const BACKEND = process.env.REACT_APP_BACKEND_URL;

async function uploadPhoto(file) {
  const fd = new FormData();
  fd.append("file", file);
  const r = await api.post("/upload", fd);
  return `${BACKEND}${r.data.url}`;
}

export function ClassBPH({ klass }) {
  const { user } = useAuth();
  const canManage = user.role === "ketua_kelas" && user.kelas === klass.name;
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const dragRef = useRef(null);
  const base = `/classes/${klass.id}/bph`;

  const load = useCallback(() => {
    setLoading(true);
    api.get(base).then(r => setNodes(r.data)).finally(() => setLoading(false));
  }, [base]);
  useEffect(() => { load(); }, [load]);

  const remove = async (node) => {
    if (!window.confirm(`Hapus "${node.name}" beserta seluruh bawahannya?`)) return;
    try { await api.delete(`${base}/${node.id}`); toast.success("Anggota dihapus"); load(); }
    catch (e) { toast.error(e.response?.data?.detail || "Gagal menghapus"); }
  };

  const onDropNode = async (targetId) => {
    const draggedId = dragRef.current;
    dragRef.current = null;
    if (!draggedId || draggedId === targetId) return;
    const byId = {};
    nodes.forEach(n => (byId[n.id] = n));
    const isDescendant = (nid, ancestorId) => {
      let cur = byId[nid];
      while (cur && cur.parent_id) { if (cur.parent_id === ancestorId) return true; cur = byId[cur.parent_id]; }
      return false;
    };
    if (isDescendant(targetId, draggedId)) { toast.error("Tidak bisa memindahkan ke dalam bawahannya sendiri"); return; }
    const dragged = byId[draggedId], target = byId[targetId];
    try {
      if ((dragged.parent_id || null) === (target.parent_id || null)) {
        const sibs = nodes.filter(n => (n.parent_id || null) === (target.parent_id || null) && n.id !== draggedId)
          .sort((a, b) => (a.order || 0) - (b.order || 0));
        const idx = sibs.findIndex(s => s.id === targetId);
        sibs.splice(idx + 1, 0, dragged);
        await Promise.all(sibs.map((s, i) => (s.order !== i ? api.patch(`${base}/${s.id}`, { order: i }) : null)).filter(Boolean));
        toast.success("Urutan diperbarui");
      } else {
        const childCount = nodes.filter(n => n.parent_id === targetId).length;
        await api.patch(`${base}/${draggedId}`, { parent_id: targetId, order: childCount });
        toast.success(`${dragged.name} dipindah ke bawah ${target.name}`);
      }
      load();
    } catch (e) { toast.error(e.response?.data?.detail || "Gagal memindahkan"); }
  };

  const tree = buildTree(nodes);
  return (
    <div className="space-y-5" data-testid="bph-tab">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-heading text-xl font-extrabold text-slate-900">Bagan BPH {klass.name}</h2>
          <p className="text-xs text-slate-500 mt-0.5">Badan Pengurus Harian kelas. Dapat dikembangkan ke bawah tanpa batas.</p>
        </div>
        {canManage && (
          <button data-testid="bph-add-root" onClick={() => setModal({ mode: "add", parent: null })}
            className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-xl shadow-lg shadow-sky-600/30 flex items-center gap-2">
            <Plus className="w-4 h-4" />Tambah Anggota Puncak
          </button>
        )}
      </div>
      {!canManage && (
        <p data-testid="bph-readonly-note" className="text-sm text-slate-500 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5">
          <Lock className="w-4 h-4" />Hanya Ketua Kelas {klass.name} yang dapat mengatur bagan BPH.
        </p>
      )}
      {canManage && nodes.length > 0 && (
        <div data-testid="bph-root-dropzone" onDragOver={e => e.preventDefault()}
          onDrop={async () => {
            const draggedId = dragRef.current; dragRef.current = null;
            const dragged = nodes.find(n => n.id === draggedId);
            if (!dragged || !dragged.parent_id) return;
            try {
              const rootCount = nodes.filter(n => !n.parent_id).length;
              await api.patch(`${base}/${draggedId}`, { parent_id: null, order: rootCount });
              toast.success(`${dragged.name} dijadikan puncak`); load();
            } catch (e) { toast.error(e.response?.data?.detail || "Gagal memindahkan"); }
          }}
          className="text-center text-xs font-semibold text-slate-400 border-2 border-dashed border-slate-200 rounded-xl py-2.5 hover:border-sky-300 hover:text-sky-500 transition-colors">
          Tarik ke sini untuk menjadikan anggota sebagai puncak
        </div>
      )}
      {loading ? <p className="text-slate-400 py-16 text-center">Memuat bagan...</p> : tree.length === 0 ? (
        canManage ? (
          <button data-testid="bph-empty-add" onClick={() => setModal({ mode: "add", parent: null })}
            className="group flex flex-col items-center gap-3 border-2 border-dashed border-slate-300 hover:border-sky-400 rounded-2xl px-10 py-8 transition-all hover:bg-sky-50/50 w-full max-w-sm mx-auto">
            <div className="w-16 h-16 rounded-full bg-slate-100 group-hover:bg-sky-100 flex items-center justify-center transition-colors">
              <Plus className="w-8 h-8 text-slate-400 group-hover:text-sky-600" />
            </div>
            <p className="font-heading font-bold text-slate-700">Isi slot pertama</p>
            <p className="text-xs text-slate-400 text-center">Tambahkan anggota puncak (mis. Ketua Kelas), lalu kembangkan ke bawah tanpa batas.</p>
          </button>
        ) : <p className="text-slate-400 text-sm py-10 text-center">Bagan BPH belum diisi.</p>
      ) : (
        <div className="bg-gradient-to-b from-slate-50 to-white border border-slate-200 rounded-2xl p-5 shadow-sm overflow-x-auto">
          <OrgTree tree={tree} testId="bph-tree" actions={canManage ? {
            onAdd: (parent) => setModal({ mode: "add", parent }),
            onEdit: (node) => setModal({ mode: "edit", node }),
            onDelete: remove, dragRef, onDropNode,
          } : null} />
        </div>
      )}
      {modal && <BphModal mode={modal.mode} node={modal.node} parent={modal.parent} nodes={nodes} base={base}
        onClose={() => setModal(null)} onDone={() => { load(); setModal(null); }} />}
    </div>
  );
}

function parentOptions(nodes, excludeId) {
  const out = [];
  const walk = (list, depth) => list.forEach(n => {
    if (n.id === excludeId) return;
    out.push({ id: n.id, label: `${"— ".repeat(depth)}${n.name} (${n.title}) · Lapis ${depth + 1}` });
    walk(n.children, depth + 1);
  });
  walk(buildTree(nodes), 0);
  return out;
}

function BphModal({ mode, node, parent, nodes, base, onClose, onDone }) {
  const isEdit = mode === "edit";
  const [name, setName] = useState(node?.name || "");
  const [title, setTitle] = useState(node?.title || "");
  const [photo, setPhoto] = useState(node?.photo || "");
  const [dashed, setDashed] = useState(node?.dashed || false);
  const [order, setOrder] = useState(node?.order ?? nodes.filter(n => (n.parent_id || "") === (parent?.id || "")).length);
  const [parentId, setParentId] = useState(isEdit ? (node.parent_id || "") : (parent?.id || ""));
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const options = parentOptions(nodes, isEdit ? node.id : null);

  const onFile = async (e) => {
    if (!e.target.files?.length) return;
    setUploading(true);
    try { setPhoto(await uploadPhoto(e.target.files[0])); }
    catch { toast.error("Gagal upload foto"); }
    finally { setUploading(false); }
  };
  const save = async () => {
    if (!name.trim() || !title.trim()) return toast.error("Nama dan jabatan wajib diisi");
    setBusy(true);
    try {
      if (isEdit) { await api.patch(`${base}/${node.id}`, { name, title, photo, dashed, order: +order, parent_id: parentId || null }); toast.success("Anggota diperbarui"); }
      else { await api.post(base, { name, title, photo, dashed, order: +order, parent_id: parentId || null }); toast.success("Anggota ditambahkan"); }
      onDone();
    } catch (e) { toast.error(e.response?.data?.detail || "Gagal menyimpan"); }
    finally { setBusy(false); }
  };
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <h3 className="font-heading text-xl font-bold">{isEdit ? "Edit Anggota" : parent ? `Tambah Bawahan: ${parent.name}` : "Tambah Anggota Puncak"}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
              {photo ? <img src={photo} alt="" className="w-full h-full object-cover" /> : <User className="w-8 h-8 text-slate-300" />}
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase flex items-center gap-1"><Upload className="w-3.5 h-3.5" />Foto</label>
              <input data-testid="bph-photo-input" type="file" accept="image/*" onChange={onFile} className="mt-1 text-sm" />
              {uploading && <p className="text-xs text-sky-600 mt-1">Mengunggah...</p>}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Nama *</label>
            <input data-testid="bph-name-input" value={name} onChange={e => setName(e.target.value)} placeholder="mis. Budi Santoso"
              className="mt-1 w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl focus:border-sky-500 outline-none" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Jabatan *</label>
            <input data-testid="bph-title-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="mis. Ketua Kelas / Sekretaris 1"
              className="mt-1 w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl focus:border-sky-500 outline-none" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Atasan (posisi lapis)</label>
            <select data-testid="bph-parent-select" value={parentId} onChange={e => setParentId(e.target.value)}
              className="mt-1 w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl focus:border-sky-500 outline-none bg-white">
              <option value="">— Tidak ada (Lapis 1 / Puncak) —</option>
              {options.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Urutan</label>
              <input data-testid="bph-order-input" type="number" value={order} onChange={e => setOrder(e.target.value)}
                className="mt-1 w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl focus:border-sky-500 outline-none" />
            </div>
            <label className="flex items-end gap-2 pb-2.5 cursor-pointer">
              <input type="checkbox" data-testid="bph-dashed-checkbox" checked={dashed} onChange={e => setDashed(e.target.checked)} className="w-4 h-4" />
              <span className="text-sm text-slate-600">Garis putus-putus (penasihat)</span>
            </label>
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={onClose} className="flex-1 py-2.5 border-2 border-slate-200 rounded-xl font-semibold hover:bg-slate-50">Batal</button>
            <button data-testid="bph-save-button" disabled={busy || uploading} onClick={save}
              className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 disabled:opacity-60 flex items-center justify-center gap-1">
              <Check className="w-4 h-4" />{busy ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
