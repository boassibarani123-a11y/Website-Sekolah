import React, { useEffect, useState } from "react";
import api from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Network, Plus, X, Pencil, Trash2, UserPlus, Upload, User } from "lucide-react";

const BACKEND = process.env.REACT_APP_BACKEND_URL;

async function uploadPhoto(file) {
  const fd = new FormData();
  fd.append("file", file);
  const r = await api.post("/upload", fd);
  return `${BACKEND}${r.data.url}`;
}

function buildTree(nodes) {
  const byId = {};
  nodes.forEach(n => (byId[n.id] = { ...n, children: [] }));
  const roots = [];
  nodes.forEach(n => {
    if (n.parent_id && byId[n.parent_id]) byId[n.parent_id].children.push(byId[n.id]);
    else roots.push(byId[n.id]);
  });
  function sortRec(arr) {
    arr.sort((a, b) => (a.order || 0) - (b.order || 0));
    arr.forEach(c => sortRec(c.children));
  }
  sortRec(roots);
  return roots;
}

export default function OrgStructure() {
  const { user } = useAuth();
  const isAdmin = user.role === "super_admin";
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // {mode:'add'|'edit', node, parent}

  const load = () => {
    setLoading(true);
    api.get("/org").then(r => setNodes(r.data)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const remove = async (node) => {
    if (!confirm(`Hapus "${node.name}" beserta seluruh bawahannya?`)) return;
    try { await api.delete(`/org/${node.id}`); toast.success("Anggota dihapus"); load(); }
    catch (e) { toast.error(e.response?.data?.detail || "Gagal menghapus"); }
  };

  const tree = buildTree(nodes);

  return (
    <div className="space-y-6" data-testid="org-structure-page">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-3xl font-extrabold text-slate-900 flex items-center gap-2">
            <Network className="w-7 h-7 text-sky-600" />Struktur Organisasi
          </h1>
          <p className="mt-1 text-sm text-slate-500">Bagan organisasi sekolah — tak terbatas, memanjang ke bawah sesuai kebutuhan.</p>
        </div>
        {isAdmin && (
          <button data-testid="add-root-node-button" onClick={() => setModal({ mode: "add", parent: null })}
            className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-xl shadow-lg shadow-sky-600/30 flex items-center gap-2">
            <Plus className="w-4 h-4" />Tambah Anggota Puncak
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-slate-400 py-20 text-center">Memuat struktur...</p>
      ) : tree.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center">
          <Network className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="mt-3 text-slate-500 font-medium">Belum ada struktur organisasi.</p>
          {isAdmin && <p className="text-sm text-slate-400">Klik "Tambah Anggota Puncak" untuk mulai (mis. Kepala Sekolah).</p>}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm overflow-x-auto">
          <div className="org-tree" data-testid="org-tree">
            <ul>
              {tree.map(n => (
                <OrgNode key={n.id} node={n} isAdmin={isAdmin}
                  onAdd={(parent) => setModal({ mode: "add", parent })}
                  onEdit={(node) => setModal({ mode: "edit", node })}
                  onDelete={remove} />
              ))}
            </ul>
          </div>
        </div>
      )}

      {modal && (
        <NodeModal mode={modal.mode} node={modal.node} parent={modal.parent}
          onClose={() => setModal(null)} onDone={() => { load(); setModal(null); }} />
      )}
    </div>
  );
}

function OrgNode({ node, isAdmin, onAdd, onEdit, onDelete }) {
  return (
    <li className={node.dashed ? "dashed" : ""}>
      <div data-testid={`org-node-${node.id}`}
        className="group inline-flex flex-col items-center bg-white border-2 border-slate-200 rounded-2xl px-4 py-3 shadow-sm hover:border-sky-400 hover:shadow-md transition-all w-44">
        <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center">
          {node.photo ? <img src={node.photo} alt={node.name} className="w-full h-full object-cover" />
            : <User className="w-7 h-7 text-slate-300" />}
        </div>
        <p className="mt-2 font-heading font-bold text-sm text-slate-900 leading-tight">{node.name}</p>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-600 leading-tight mt-0.5">{node.title}</p>
        {isAdmin && (
          <div className="mt-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button data-testid={`org-add-child-${node.id}`} onClick={() => onAdd(node)} title="Tambah bawahan"
              className="p-1.5 rounded-lg bg-sky-50 text-sky-600 hover:bg-sky-100"><UserPlus className="w-3.5 h-3.5" /></button>
            <button data-testid={`org-edit-${node.id}`} onClick={() => onEdit(node)} title="Edit"
              className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"><Pencil className="w-3.5 h-3.5" /></button>
            <button data-testid={`org-delete-${node.id}`} onClick={() => onDelete(node)} title="Hapus"
              className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        )}
      </div>
      {node.children.length > 0 && (
        <ul>
          {node.children.map(c => React.createElement(OrgNode, { key: c.id, node: c, isAdmin, onAdd, onEdit, onDelete }))}
        </ul>
      )}
    </li>
  );
}

function NodeModal({ mode, node, parent, onClose, onDone }) {
  const isEdit = mode === "edit";
  const [name, setName] = useState(node?.name || "");
  const [title, setTitle] = useState(node?.title || "");
  const [photo, setPhoto] = useState(node?.photo || "");
  const [dashed, setDashed] = useState(node?.dashed || false);
  const [order, setOrder] = useState(node?.order ?? 0);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);

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
      if (isEdit) {
        await api.patch(`/org/${node.id}`, { name, title, photo, dashed, order: +order });
        toast.success("Anggota diperbarui");
      } else {
        await api.post("/org", { name, title, photo, dashed, order: +order, parent_id: parent ? parent.id : null });
        toast.success("Anggota ditambahkan");
      }
      onDone();
    } catch (e) { toast.error(e.response?.data?.detail || "Gagal menyimpan"); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <h3 className="font-heading text-xl font-bold">
            {isEdit ? "Edit Anggota" : parent ? `Tambah Bawahan: ${parent.name}` : "Tambah Anggota Puncak"}
          </h3>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
              {photo ? <img src={photo} alt="" className="w-full h-full object-cover" /> : <User className="w-8 h-8 text-slate-300" />}
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase flex items-center gap-1"><Upload className="w-3.5 h-3.5" />Foto</label>
              <input data-testid="org-photo-input" type="file" accept="image/*" onChange={onFile} className="mt-1 text-sm" />
              {uploading && <p className="text-xs text-sky-600 mt-1">Mengunggah...</p>}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Nama *</label>
            <input data-testid="org-name-input" value={name} onChange={e => setName(e.target.value)} placeholder="mis. Marihot Malau"
              className="mt-1 w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl focus:border-sky-500 outline-none" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Jabatan *</label>
            <input data-testid="org-title-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="mis. Kepala Sekolah"
              className="mt-1 w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl focus:border-sky-500 outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Urutan</label>
              <input type="number" value={order} onChange={e => setOrder(e.target.value)}
                className="mt-1 w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl focus:border-sky-500 outline-none" />
            </div>
            <label className="flex items-end gap-2 pb-2.5 cursor-pointer">
              <input type="checkbox" data-testid="org-dashed-checkbox" checked={dashed} onChange={e => setDashed(e.target.checked)} className="w-4 h-4" />
              <span className="text-sm text-slate-600">Garis putus-putus (penasihat)</span>
            </label>
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={onClose} className="flex-1 py-2.5 border-2 border-slate-200 rounded-xl font-semibold hover:bg-slate-50">Batal</button>
            <button data-testid="save-org-node-button" disabled={busy || uploading} onClick={save}
              className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 disabled:opacity-60">
              {busy ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
