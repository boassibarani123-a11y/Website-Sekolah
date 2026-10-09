import { useEffect, useState } from "react";
import api from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Download, Wand2, CheckCircle2, XCircle, Eye, X, Pencil, Trash2, MessageCircle, Save } from "lucide-react";

const STATUS_STYLE = {
  pending: "bg-slate-100 text-slate-700 border-slate-200",
  review: "bg-sky-100 text-sky-700 border-sky-200",
  lolos: "bg-emerald-100 text-emerald-700 border-emerald-200",
  tidak_lolos: "bg-rose-100 text-rose-700 border-rose-200",
};

export default function AdminPpdb() {
  const { user } = useAuth();
  const isSuper = user?.role === "super_admin";
  const [list, setList] = useState([]);
  const [filter, setFilter] = useState("");
  const [statusF, setStatusF] = useState("all");
  const [detail, setDetail] = useState(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [edit, setEdit] = useState(null);
  const [selectOpen, setSelectOpen] = useState(false);
  const [threshold, setThreshold] = useState(75);
  const [capacity, setCapacity] = useState(100);

  const load = () => api.get("/ppdb").then(r => setList(r.data));
  useEffect(() => { load(); }, []);

  const filtered = list.filter(p =>
    (statusF === "all" || p.status === statusF) &&
    (!filter || p.full_name.toLowerCase().includes(filter.toLowerCase()) || (p.nisn || "").includes(filter))
  );

  const stats = {
    total: list.length,
    pending: list.filter(p=>p.status==="pending").length,
    lolos: list.filter(p=>p.status==="lolos").length,
    tidak: list.filter(p=>p.status==="tidak_lolos").length,
  };

  const updateStatus = async (id, status) => {
    await api.patch(`/ppdb/${id}?status=${status}`);
    toast.success(`Status → ${status.replace("_", " ")}`); load();
  };
  const saveNote = async (id, notes) => {
    try { await api.patch(`/ppdb/${id}?notes=${encodeURIComponent(notes)}`); toast.success("Catatan disimpan"); load(); }
    catch { toast.error("Gagal menyimpan catatan"); }
  };
  const waNotify = (p) => {
    const raw = (p.parent_phone || p.phone || "").replace(/\D/g, "");
    if (!raw) return null;
    const n = raw.startsWith("0") ? "62" + raw.slice(1) : raw;
    const st = p.status === "lolos" ? "DINYATAKAN LOLOS" : p.status === "tidak_lolos" ? "dinyatakan BELUM LOLOS" : "sedang dalam proses seleksi";
    const msg = `Halo ${p.parent_name || "Bapak/Ibu"}, hasil seleksi PPDB a.n. ${p.full_name} di SMA Negeri 1 Laguboti: ${st}.` + (p.notes ? ` Catatan: ${p.notes}.` : "") + ` Terima kasih.`;
    return `https://wa.me/${n}?text=${encodeURIComponent(msg)}`;
  };
  const runAutoSelect = async () => {
    try {
      const r = await api.post(`/ppdb/auto-select?threshold=${threshold}&capacity=${capacity}`);
      toast.success(`Auto-seleksi selesai: ${r.data.accepted} lolos, ${r.data.rejected} tidak lolos`);
      setSelectOpen(false); load();
    } catch (e) { toast.error("Gagal auto-seleksi"); }
  };
  const exportXlsx = async () => {
    const r = await api.get("/ppdb/export/xlsx", {responseType:"blob"});
    const url = URL.createObjectURL(r.data);
    const a = document.createElement("a"); a.href = url; a.download = "PPDB_Rekap.xlsx"; a.click();
  };
  const delItem = async (id) => {
    if (!window.confirm("Hapus pendaftar ini secara permanen?")) return;
    try { await api.delete(`/ppdb/${id}`); toast.success("Pendaftar dihapus"); setDetail(null); load(); }
    catch (e) { toast.error(e?.response?.data?.detail || "Gagal menghapus"); }
  };
  const saveEdit = async () => {
    try {
      const { id, ...payload } = edit;
      await api.put(`/ppdb/${id}`, payload);
      toast.success("Data pendaftar diperbarui"); setEdit(null); load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Gagal menyimpan"); }
  };

  return (
    <div className="space-y-6" data-testid="admin-ppdb-page">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-3xl font-extrabold">📥 Admin PPDB</h1>
          <p className="mt-1 text-sm text-slate-500">Kelola pendaftar peserta didik baru & jalankan seleksi otomatis</p>
        </div>
        <div className="flex gap-2">
          <button data-testid="auto-select-button" onClick={()=>setSelectOpen(true)}
            className="px-4 py-2.5 bg-sky-600 text-white rounded-xl font-semibold flex items-center gap-2 hover:bg-sky-700 shadow-lg">
            <Wand2 className="w-4 h-4"/>Auto-Seleksi
          </button>
          <button data-testid="ppdb-export-button" onClick={exportXlsx}
            className="px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold flex items-center gap-2 hover:bg-emerald-700 shadow-lg">
            <Download className="w-4 h-4"/>Export Excel
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {l:"Total Pendaftar", v:stats.total, c:"from-slate-700 to-slate-900"},
          {l:"Pending", v:stats.pending, c:"from-amber-500 to-amber-600"},
          {l:"Lolos", v:stats.lolos, c:"from-emerald-500 to-emerald-600"},
          {l:"Tidak Lolos", v:stats.tidak, c:"from-rose-500 to-rose-600"},
        ].map(x => (
          <div key={x.l} className={`bg-gradient-to-br ${x.c} text-white p-4 rounded-2xl shadow-lg`}>
            <p className="text-xs font-semibold uppercase tracking-wider opacity-90">{x.l}</p>
            <p className="mt-2 font-heading text-3xl font-extrabold">{x.v}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap">
        <input value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Cari nama / NISN..."
          className="flex-1 min-w-[200px] px-3 py-2 border-2 border-slate-200 rounded-xl focus:border-sky-500 outline-none"/>
        <select value={statusF} onChange={e=>setStatusF(e.target.value)}
          className="px-3 py-2 border-2 border-slate-200 rounded-xl">
          <option value="all">Semua Status</option>
          <option value="pending">Pending</option>
          <option value="review">Review</option>
          <option value="lolos">Lolos</option>
          <option value="tidak_lolos">Tidak Lolos</option>
        </select>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <th className="px-4 py-3">Nama</th><th className="px-4 py-3">Asal</th><th className="px-4 py-3">NEM</th>
                <th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(p=>(
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900">{p.full_name}</p>
                    <p className="text-[11px] text-slate-500">NISN {p.nisn || "—"} · {p.parent_email}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{p.prev_school}</td>
                  <td className="px-4 py-3 font-mono-alt font-bold text-slate-900">{p.nem_avg}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-full border ${STATUS_STYLE[p.status] || STATUS_STYLE.pending}`}>{p.status.replace("_"," ")}</span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-1">
                    <button data-testid={`ppdb-detail-${p.id}`} onClick={()=>{setDetail(p); setNoteDraft(p.notes||"");}} className="p-1.5 bg-slate-100 rounded-lg hover:bg-slate-200"><Eye className="w-3.5 h-3.5"/></button>
                    <button data-testid={`ppdb-quick-lolos-${p.id}`} onClick={()=>updateStatus(p.id,"lolos")} className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200"><CheckCircle2 className="w-3.5 h-3.5"/></button>
                    <button data-testid={`ppdb-quick-tolak-${p.id}`} onClick={()=>{setDetail(p); setNoteDraft(p.notes||""); toast.info("Isi alasan penolakan, lalu klik Tidak Lolos");}} className="p-1.5 bg-rose-100 text-rose-700 rounded-lg hover:bg-rose-200"><XCircle className="w-3.5 h-3.5"/></button>
                    {isSuper && <button data-testid={`ppdb-edit-${p.id}`} onClick={()=>setEdit({...p})} className="p-1.5 bg-sky-100 text-sky-700 rounded-lg hover:bg-sky-200"><Pencil className="w-3.5 h-3.5"/></button>}
                    {isSuper && <button data-testid={`ppdb-del-${p.id}`} onClick={()=>delItem(p.id)} className="p-1.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700"><Trash2 className="w-3.5 h-3.5"/></button>}
                  </td>
                </tr>
              ))}
              {filtered.length===0 && <tr><td colSpan={6} className="p-8 text-center text-slate-400 italic">Tidak ada data.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {selectOpen && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-6">
            <h3 className="font-heading text-xl font-bold flex items-center gap-2"><Wand2 className="w-5 h-5 text-sky-600"/>Auto-Seleksi PPDB</h3>
            <p className="mt-1 text-sm text-slate-500">Sistem akan menyortir pendaftar dari NEM tertinggi. Yang memenuhi threshold dan kapasitas → LOLOS.</p>
            <div className="mt-4 space-y-3">
              <div><label className="text-xs font-semibold uppercase text-slate-600">Threshold NEM Minimum</label>
                <input type="number" value={threshold} onChange={e=>setThreshold(+e.target.value)} className="mt-1 w-full px-3 py-2 border-2 border-slate-200 rounded-xl"/></div>
              <div><label className="text-xs font-semibold uppercase text-slate-600">Kapasitas Kuota</label>
                <input type="number" value={capacity} onChange={e=>setCapacity(+e.target.value)} className="mt-1 w-full px-3 py-2 border-2 border-slate-200 rounded-xl"/></div>
            </div>
            <div className="mt-6 flex gap-2">
              <button onClick={()=>setSelectOpen(false)} className="flex-1 py-2.5 border-2 border-slate-200 rounded-xl font-semibold">Batal</button>
              <button onClick={runAutoSelect} className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl font-semibold">Jalankan</button>
            </div>
          </div>
        </div>
      )}

      {detail && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-heading font-bold text-lg">{detail.full_name}</h3>
              <button onClick={()=>setDetail(null)}><X className="w-5 h-5"/></button>
            </div>
            <div className="p-5 space-y-3">
              {detail.photo_url && <img src={detail.photo_url} alt="" className="w-24 h-28 object-cover rounded-xl border-2"/>}
              <Row k="NISN" v={detail.nisn}/><Row k="Tempat/Tgl Lahir" v={`${detail.birth_place||"-"} / ${detail.birth_date||"-"}`}/>
              <Row k="Alamat" v={detail.address}/><Row k="HP" v={detail.phone}/>
              <Row k="Asal Sekolah" v={detail.prev_school}/><Row k="NEM" v={detail.nem_avg}/>
              <Row k="Ortu" v={`${detail.parent_name} (${detail.parent_phone})`}/>
              <Row k="Email Ortu" v={detail.parent_email}/>
              <div><p className="text-xs font-semibold uppercase text-slate-600 mb-1">Berkas Dokumen (Rapor / Ijazah)</p>
                {detail.berkas_urls?.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2" data-testid="ppdb-detail-docs">
                    {detail.berkas_urls.map((u, i) => (<a key={i} href={u} target="_blank" rel="noreferrer" data-testid={`ppdb-doc-${i}`}
                      className="group block rounded-xl border-2 border-slate-200 hover:border-sky-400 overflow-hidden bg-slate-50">
                      {/\.(jpe?g|png|webp)$/i.test(u)
                        ? <img src={u} alt={`Dokumen ${i + 1}`} className="w-full h-20 object-cover group-hover:scale-105 transition-transform"/>
                        : <div className="h-20 flex items-center justify-center text-2xl">📄</div>}
                      <p className="text-[10px] font-semibold text-center py-1 text-sky-700">Dokumen #{i + 1}</p></a>))}
                  </div>
                ) : <p className="text-xs text-slate-400 italic">Belum ada berkas yang diunggah.</p>}
              </div>

              <div className="pt-3 border-t border-slate-100">
                <p className="text-xs font-semibold uppercase text-slate-600 mb-1.5">Ubah Status Seleksi</p>
                <div className="flex gap-2 flex-wrap">
                  {[["pending","Pending","bg-slate-100 text-slate-700"],["review","Review","bg-sky-100 text-sky-700"],["lolos","Lolos","bg-emerald-100 text-emerald-700"],["tidak_lolos","Tidak Lolos","bg-rose-100 text-rose-700"]].map(([s,l,c])=>(
                    <button key={s} data-testid={`ppdb-detail-status-${s}`} onClick={async()=>{
                      if (s==="tidak_lolos" && !noteDraft.trim()) { toast.error("Isi alasan penolakan terlebih dahulu"); return; }
                      if (s==="tidak_lolos" && noteDraft !== (detail.notes||"")) await saveNote(detail.id, noteDraft);
                      await updateStatus(detail.id,s); setDetail({...detail,status:s,notes:noteDraft});}}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold ${detail.status===s?"ring-2 ring-offset-1 ring-slate-400 "+c:c} hover:opacity-80`}>{l}</button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase text-slate-600">Catatan / Alasan Penolakan</label>
                <textarea data-testid="ppdb-detail-note" rows={2} value={noteDraft} onChange={e=>setNoteDraft(e.target.value)}
                  placeholder="mis. Nilai di bawah passing grade, berkas tidak lengkap..."
                  className="mt-1 w-full px-3 py-2 border-2 border-slate-200 rounded-xl text-sm focus:border-sky-500 outline-none"/>
                <button data-testid="ppdb-detail-save-note" onClick={()=>{saveNote(detail.id, noteDraft); setDetail({...detail, notes: noteDraft});}}
                  className="mt-2 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"><Save className="w-3.5 h-3.5"/>Simpan Catatan</button>
              </div>

              {waNotify(detail) ? (
                <a data-testid="ppdb-detail-wa" href={waNotify(detail)} target="_blank" rel="noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-2.5 bg-emerald-500 text-white rounded-xl font-semibold hover:bg-emerald-600">
                  <MessageCircle className="w-4 h-4"/>Kirim Notifikasi Status via WhatsApp
                </a>
              ) : (
                <p className="text-xs text-amber-600 text-center">Nomor WhatsApp ortu/siswa belum tersedia untuk notifikasi.</p>
              )}
            </div>
          </div>
        </div>
      )}
      {edit && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4" onClick={()=>setEdit(null)}>
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e=>e.stopPropagation()} data-testid="ppdb-edit-modal">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-heading font-bold text-lg">Ubah Data Pendaftar</h3>
              <button onClick={()=>setEdit(null)}><X className="w-5 h-5"/></button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-3">
              <EF label="Nama Lengkap" v={edit.full_name} on={v=>setEdit({...edit,full_name:v})} span/>
              <EF label="NISN" v={edit.nisn} on={v=>setEdit({...edit,nisn:v})}/>
              <EF label="Asal Sekolah" v={edit.prev_school} on={v=>setEdit({...edit,prev_school:v})}/>
              <EF label="NEM" type="number" v={edit.nem_avg} on={v=>setEdit({...edit,nem_avg:Number(v)})}/>
              <EF label="HP Siswa" v={edit.phone} on={v=>setEdit({...edit,phone:v})}/>
              <EF label="Nama Ortu" v={edit.parent_name} on={v=>setEdit({...edit,parent_name:v})}/>
              <EF label="HP Ortu" v={edit.parent_phone} on={v=>setEdit({...edit,parent_phone:v})}/>
              <EF label="Email Ortu" v={edit.parent_email} on={v=>setEdit({...edit,parent_email:v})} span/>
              <EF label="Alamat" v={edit.address} on={v=>setEdit({...edit,address:v})} span/>
              <div className="col-span-2"><label className="text-[11px] font-semibold uppercase text-slate-500">Status</label>
                <select value={edit.status||"pending"} onChange={e=>setEdit({...edit,status:e.target.value})} className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
                  <option value="pending">Pending</option><option value="review">Review</option><option value="lolos">Lolos</option><option value="tidak_lolos">Tidak Lolos</option></select></div>
            </div>
            <div className="p-5 border-t flex gap-2">
              <button onClick={()=>setEdit(null)} className="flex-1 py-2.5 border-2 border-slate-200 rounded-xl font-semibold">Batal</button>
              <button data-testid="ppdb-edit-save" onClick={saveEdit} className="flex-1 py-2.5 bg-sky-600 text-white rounded-xl font-semibold">Simpan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EF({label, v, on, type="text", span}) {
  return <div className={span?"col-span-2":""}>
    <label className="text-[11px] font-semibold uppercase text-slate-500">{label}</label>
    <input type={type} value={v??""} onChange={e=>on(e.target.value)} className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"/>
  </div>;
}

function Row({k,v}) { return <div className="grid grid-cols-3 gap-2 text-sm border-b border-slate-100 pb-1.5">
  <p className="col-span-1 text-slate-500">{k}</p>
  <p className="col-span-2 text-slate-900 font-medium">{v || "-"}</p>
</div>; }
