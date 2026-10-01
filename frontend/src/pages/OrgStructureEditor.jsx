import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Network, Plus, X, Pencil, Trash2, UserPlus, Upload, User, Image, FileDown, ArrowLeft, GraduationCap, Check } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const BACKEND = process.env.REACT_APP_BACKEND_URL;

const LEVELS = [
  { bar: "bg-sky-500", ring: "ring-sky-300", grad: "from-sky-50", pill: "bg-sky-100 text-sky-700" },
  { bar: "bg-indigo-500", ring: "ring-indigo-300", grad: "from-indigo-50", pill: "bg-indigo-100 text-indigo-700" },
  { bar: "bg-emerald-500", ring: "ring-emerald-300", grad: "from-emerald-50", pill: "bg-emerald-100 text-emerald-700" },
  { bar: "bg-amber-500", ring: "ring-amber-300", grad: "from-amber-50", pill: "bg-amber-100 text-amber-700" },
  { bar: "bg-rose-500", ring: "ring-rose-300", grad: "from-rose-50", pill: "bg-rose-100 text-rose-700" },
  { bar: "bg-violet-500", ring: "ring-violet-300", grad: "from-violet-50", pill: "bg-violet-100 text-violet-700" },
];
const lvl = (d) => LEVELS[d % LEVELS.length];

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

export default function OrgStructureEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user.role === "super_admin";
  const [structure, setStructure] = useState(null);
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const chartRef = useRef(null);
  const dragRef = useRef(null);

  const loadStructure = () => api.get(`/org-structures/${id}`).then(r => setStructure(r.data))
    .catch(() => { toast.error("Struktur tidak ditemukan"); navigate("/org-structure"); });
  const load = () => {
    setLoading(true);
    api.get(`/org?structure_id=${id}`).then(r => setNodes(r.data)).finally(() => setLoading(false));
  };
  useEffect(() => { loadStructure(); load(); }, [id]);

  const remove = async (node) => {
    if (!window.confirm(`Hapus "${node.name}" beserta seluruh bawahannya?`)) return;
    try { await api.delete(`/org/${node.id}`); toast.success("Anggota dihapus"); load(); }
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
        await Promise.all(sibs.map((s, i) => (s.order !== i ? api.patch(`/org/${s.id}`, { order: i }) : null)).filter(Boolean));
        toast.success("Urutan diperbarui");
      } else {
        const childCount = nodes.filter(n => n.parent_id === targetId).length;
        await api.patch(`/org/${draggedId}`, { parent_id: targetId, order: childCount });
        toast.success(`${dragged.name} dipindah ke bawah ${target.name}`);
      }
      load();
    } catch (e) { toast.error(e.response?.data?.detail || "Gagal memindahkan"); }
  };

  const onDropRoot = async () => {
    const draggedId = dragRef.current;
    dragRef.current = null;
    if (!draggedId) return;
    const dragged = nodes.find(n => n.id === draggedId);
    if (!dragged || !dragged.parent_id) return;
    try {
      const rootCount = nodes.filter(n => !n.parent_id).length;
      await api.patch(`/org/${draggedId}`, { parent_id: null, order: rootCount });
      toast.success(`${dragged.name} dijadikan puncak`);
      load();
    } catch (e) { toast.error(e.response?.data?.detail || "Gagal memindahkan"); }
  };

  const exportImage = async (asPdf) => {
    if (!chartRef.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(chartRef.current, { backgroundColor: "#ffffff", scale: 2 });
      if (asPdf) {
        const img = canvas.toDataURL("image/png");
        const pdf = new jsPDF({ orientation: canvas.width >= canvas.height ? "landscape" : "portrait", unit: "px", format: [canvas.width, canvas.height] });
        pdf.addImage(img, "PNG", 0, 0, canvas.width, canvas.height);
        pdf.save(`${structure?.name || "struktur"}.pdf`);
      } else {
        const link = document.createElement("a");
        link.download = `${structure?.name || "struktur"}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
      }
    } catch { toast.error("Gagal mengekspor bagan"); }
    finally { setExporting(false); }
  };

  const tree = buildTree(nodes);

  return (
    <div className="space-y-5" data-testid="org-editor-page">
      {/* Top toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <button onClick={() => navigate("/org-structure")} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-sky-600">
          <ArrowLeft className="w-4 h-4" />Semua Struktur
        </button>
        <div className="flex items-center gap-2 flex-wrap">
          {nodes.length > 0 && (
            <>
              <button data-testid="org-export-png" disabled={exporting} onClick={() => exportImage(false)}
                className="px-3 py-2.5 border-2 border-slate-200 rounded-xl font-semibold text-slate-700 hover:border-sky-400 flex items-center gap-2 disabled:opacity-50">
                <Image className="w-4 h-4" />PNG
              </button>
              <button data-testid="org-export-pdf" disabled={exporting} onClick={() => exportImage(true)}
                className="px-3 py-2.5 border-2 border-slate-200 rounded-xl font-semibold text-slate-700 hover:border-sky-400 flex items-center gap-2 disabled:opacity-50">
                <FileDown className="w-4 h-4" />PDF
              </button>
            </>
          )}
          {isAdmin && (
            <button data-testid="add-root-node-button" onClick={() => setModal({ mode: "add", parent: null })}
              className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-xl shadow-lg shadow-sky-600/30 flex items-center gap-2">
              <Plus className="w-4 h-4" />Tambah Anggota Puncak
            </button>
          )}
        </div>
      </div>

      {/* Chart card with cool banner header */}
      <div className="bg-gradient-to-b from-slate-50 to-white border border-slate-200 rounded-2xl p-5 sm:p-7 shadow-sm overflow-x-auto" ref={chartRef}>
        {/* Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-sky-600 via-indigo-600 to-violet-600 px-6 py-6 text-center text-white shadow-lg">
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/10" />
          <div className="absolute -bottom-10 -left-6 w-28 h-28 rounded-full bg-white/10" />
          <div className="relative flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center border border-white/25">
              <GraduationCap className="w-6 h-6" />
            </div>
            {editingTitle && isAdmin ? (
              <TitleEditor structure={structure} onClose={() => setEditingTitle(false)} onDone={(s) => { setStructure(s); setEditingTitle(false); }} />
            ) : (
              <>
                <h1 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight uppercase drop-shadow-sm">
                  {structure?.name || "Struktur Organisasi"}
                </h1>
                {structure?.subtitle && <p className="text-sm text-sky-100/90 font-medium">{structure.subtitle}</p>}
                {isAdmin && (
                  <button onClick={() => setEditingTitle(true)}
                    className="mt-1 inline-flex items-center gap-1.5 text-[11px] font-semibold bg-white/15 hover:bg-white/25 px-2.5 py-1 rounded-lg transition-colors">
                    <Pencil className="w-3 h-3" />Ubah Judul
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Tree */}
        <div className="mt-6">
          {isAdmin && nodes.length > 0 && (
            <div data-testid="org-root-dropzone" onDragOver={e => e.preventDefault()} onDrop={onDropRoot}
              className="mb-5 text-center text-xs font-semibold text-slate-400 border-2 border-dashed border-slate-200 rounded-xl py-2.5 hover:border-sky-300 hover:text-sky-500 transition-colors">
              Tarik ke sini untuk menjadikan anggota sebagai puncak
            </div>
          )}

          {loading ? (
            <p className="text-slate-400 py-16 text-center">Memuat struktur...</p>
          ) : tree.length === 0 ? (
            <div className="py-10 flex flex-col items-center">
              {isAdmin ? (
                <button data-testid="empty-add-slot" onClick={() => setModal({ mode: "add", parent: null })}
                  className="group flex flex-col items-center gap-3 border-2 border-dashed border-slate-300 hover:border-sky-400 rounded-2xl px-10 py-8 transition-all hover:bg-sky-50/50 w-full max-w-sm">
                  <div className="w-16 h-16 rounded-full bg-slate-100 group-hover:bg-sky-100 flex items-center justify-center transition-colors">
                    <Plus className="w-8 h-8 text-slate-400 group-hover:text-sky-600" />
                  </div>
                  <p className="font-heading font-bold text-slate-700">Isi slot pertama</p>
                  <p className="text-xs text-slate-400 text-center">Tambahkan anggota puncak (mis. Kepala Sekolah), lalu kembangkan ke bawah tanpa batas.</p>
                </button>
              ) : (
                <div className="text-center">
                  <Network className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="mt-3 text-slate-500 font-medium">Struktur ini belum diisi.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="org-tree" data-testid="org-tree">
              <ul>
                {tree.map(n => (
                  <OrgNode key={n.id} node={n} depth={0} isAdmin={isAdmin}
                    onAdd={(parent) => setModal({ mode: "add", parent })}
                    onEdit={(node) => setModal({ mode: "edit", node })}
                    onDelete={remove}
                    dragRef={dragRef} onDropNode={onDropNode} />
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {modal && (
        <NodeModal mode={modal.mode} node={modal.node} parent={modal.parent} structureId={id}
          onClose={() => setModal(null)} onDone={() => { load(); setModal(null); }} />
      )}
    </div>
  );
}

function TitleEditor({ structure, onClose, onDone }) {
  const [name, setName] = useState(structure?.name || "");
  const [subtitle, setSubtitle] = useState(structure?.subtitle || "");
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!name.trim()) return toast.error("Judul wajib diisi");
    setBusy(true);
    try { const r = await api.patch(`/org-structures/${structure.id}`, { name: name.trim(), subtitle }); toast.success("Judul diperbarui"); onDone(r.data); }
    catch (e) { toast.error(e.response?.data?.detail || "Gagal menyimpan"); }
    finally { setBusy(false); }
  };
  return (
    <div className="w-full max-w-md space-y-2">
      <input data-testid="edit-structure-title" value={name} onChange={e => setName(e.target.value)} placeholder="Judul struktur"
        className="w-full px-3 py-2 rounded-lg text-slate-900 font-bold text-center outline-none" />
      <input value={subtitle} onChange={e => setSubtitle(e.target.value)} placeholder="Subjudul (opsional)"
        className="w-full px-3 py-1.5 rounded-lg text-slate-700 text-sm text-center outline-none" />
      <div className="flex justify-center gap-2">
        <button onClick={onClose} className="px-3 py-1.5 rounded-lg bg-white/20 text-white text-sm font-semibold">Batal</button>
        <button data-testid="save-structure-title" disabled={busy} onClick={save} className="px-3 py-1.5 rounded-lg bg-white text-sky-700 text-sm font-bold inline-flex items-center gap-1 disabled:opacity-60">
          <Check className="w-4 h-4" />Simpan
        </button>
      </div>
    </div>
  );
}

function OrgNode({ node, depth, isAdmin, onAdd, onEdit, onDelete, dragRef, onDropNode }) {
  const [over, setOver] = useState(false);
  const c = lvl(depth);
  return (
    <div className={`ov-item ${node.dashed ? "dashed" : ""}`}>
      <div data-testid={`org-node-${node.id}`}
        draggable={isAdmin}
        onDragStart={isAdmin ? (e) => { dragRef.current = node.id; e.stopPropagation(); } : undefined}
        onDragOver={isAdmin ? (e) => { e.preventDefault(); e.stopPropagation(); setOver(true); } : undefined}
        onDragLeave={isAdmin ? () => setOver(false) : undefined}
        onDrop={isAdmin ? (e) => { e.preventDefault(); e.stopPropagation(); setOver(false); onDropNode(node.id); } : undefined}
        className={`group relative flex items-center gap-3 bg-gradient-to-r ${c.grad} to-white border rounded-2xl pl-5 pr-3 py-3 mb-4 w-full max-w-md shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all ${over ? "border-sky-500 ring-2 ring-sky-200" : "border-slate-200 hover:border-sky-300"} ${isAdmin ? "cursor-move" : ""}`}>
        <span className={`absolute left-0 top-3 bottom-3 w-1.5 rounded-full ${c.bar}`} />
        <div className={`w-14 h-14 shrink-0 rounded-full overflow-hidden bg-white border border-slate-200 ring-2 ${c.ring} ring-offset-2 flex items-center justify-center`}>
          {node.photo ? <img src={node.photo} alt={node.name} className="w-full h-full object-cover" crossOrigin="anonymous" />
            : <User className="w-6 h-6 text-slate-300" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-heading font-bold text-[15px] text-slate-900 leading-tight truncate">{node.name}</p>
          <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${c.pill}`}>{node.title}</span>
          {node.dashed && <span className="ml-1.5 text-[10px] text-slate-400 italic">penasihat</span>}
        </div>
        {isAdmin && (
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
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
        <div className="ov-children">
          {node.children.map(ch => React.createElement(OrgNode, { key: ch.id, node: ch, depth: depth + 1, isAdmin, onAdd, onEdit, onDelete, dragRef, onDropNode }))}
        </div>
      )}
    </div>
  );
}

function NodeModal({ mode, node, parent, structureId, onClose, onDone }) {
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
        await api.post("/org", { name, title, photo, dashed, order: +order, parent_id: parent ? parent.id : null, structure_id: structureId });
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
