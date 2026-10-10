import { useEffect, useState } from "react";
import api from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Vote, Plus, X, Trash2, Award, Users, BarChart3, Pencil, Crown, CheckCircle2 } from "lucide-react";

const POS = [{v:"ketua",l:"Ketua"},{v:"wakil",l:"Wakil"}];

export default function Elections() {
  const { user } = useAuth();
  const canManage = ["super_admin","ketua_osis"].includes(user.role);
  const isVoter = ["siswa","ketua_kelas","ketua_osis"].includes(user.role);
  const [cands, setCands] = useState([]);
  const [my, setMy] = useState([]);
  const [stats, setStats] = useState(null);
  const [status, setStatus] = useState("belum");
  const [showNew, setShowNew] = useState(false);
  const [editCand, setEditCand] = useState(null);
  const [confirmCand, setConfirmCand] = useState(null);
  const loadStats = () => api.get("/election/stats").then(r => { setStats(r.data); setStatus(r.data.status); }).catch(() => {});
  const load = () => {
    api.get("/candidates").then(r=>setCands(r.data));
    if (isVoter) api.get("/my-votes").then(r=>setMy(r.data));
    loadStats();
  };
  useEffect(() => { load(); const t = setInterval(loadStats, 5000); return () => clearInterval(t); }, []); // eslint-disable-line
  const votedPositions = my.map(v=>v.position);

  const setElectionStatus = async (s) => {
    try { await api.patch(`/election/status?status=${s}`); setStatus(s); toast.success("Status pemilu diperbarui"); loadStats(); }
    catch { toast.error("Gagal mengubah status"); }
  };

  const vote = async (c) => {
    if (status !== "berlangsung") { toast.error("Pemilihan belum dibuka oleh panitia."); return; }
    try { await api.post(`/vote/${c.id}`); toast.success(`Suara untuk ${c.name} tercatat`); setConfirmCand(null); load(); }
    catch(e) { toast.error(e.response?.data?.detail||"Gagal vote"); setConfirmCand(null); }
  };
  const del = async (c) => { if (!window.confirm(`Hapus kandidat ${c.name}?`)) return; await api.delete(`/candidates/${c.id}`); toast.success("Kandidat dihapus"); load(); };
  const winners = status === "selesai" ? Object.fromEntries(POS.map(p => {
    const l = cands.filter(c => c.position === p.v).sort((a, b) => b.vote_count - a.vote_count);
    return [p.v, l[0] && l[0].vote_count > 0 ? l[0].id : null];
  })) : {};

  return <div className="space-y-6" data-testid="elections-page">
    <div className="flex items-center justify-between flex-wrap gap-3">
      <div><h1 className="font-heading text-3xl font-extrabold">Pemilu OSIS 2026</h1>
        <p className="mt-1 text-sm text-slate-500">Suara demokratis untuk pemimpin masa depan sekolah</p></div>
      {canManage && <button onClick={()=>setShowNew(true)} className="px-4 py-2.5 bg-sky-600 text-white rounded-xl font-semibold flex items-center gap-2"><Plus className="w-4 h-4"/>Kandidat Baru</button>}
    </div>

    <div className="flex items-center gap-2 flex-wrap">
      <StatusBadge status={status}/>
      {canManage && (
        <div className="flex gap-1.5" data-testid="election-status-control">
          {[["belum","Belum Dimulai"],["berlangsung","Buka Pemilihan"],["selesai","Tutup / Selesai"]].map(([s,l])=>(
            <button key={s} data-testid={`election-status-${s}`} onClick={()=>setElectionStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${status===s?"bg-slate-900 text-white":"bg-white border-2 border-slate-200 text-slate-600 hover:border-slate-400"}`}>{l}</button>
          ))}
        </div>
      )}
    </div>

    {isVoter && <VotingBooth status={status} voted={votedPositions} positions={POS.filter(p => cands.some(c => c.position === p.v))}/>}

    {stats && <QuickCount stats={stats}/>}

    {POS.map(pos => {
      const list = cands.filter(c=>c.position===pos.v);
      if (!list.length) return null;
      return <div key={pos.v}>
        <h2 className="font-heading text-xl font-bold text-slate-900 mb-3 flex items-center gap-2"><Award className="w-5 h-5 text-amber-500"/>Kandidat {pos.l}</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((c,i)=>{
            const voted = votedPositions.includes(pos.v);
            const myPick = my.some(v => v.candidate_id === c.id);
            const isWinner = winners[pos.v] === c.id;
            return <div key={c.id} data-testid={`candidate-card-${c.id}`} className={`bg-white border-2 rounded-2xl p-5 shadow-sm hover:shadow-xl transition-all relative ${isWinner ? "border-amber-400 ring-4 ring-amber-100" : myPick ? "border-emerald-400" : "border-slate-200 hover:border-sky-500"}`}>
              <div className="absolute -top-3 -left-3 w-10 h-10 rounded-full bg-slate-900 text-white font-black flex items-center justify-center border-2 border-white shadow-lg">{i+1}</div>
              {isWinner && <span data-testid={`candidate-winner-${c.id}`} className="absolute -top-3 right-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-400 text-slate-900 text-[10px] font-black uppercase shadow"><Crown className="w-3.5 h-3.5"/>Terpilih</span>}
              {myPick && <span className="absolute top-3 right-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold"><CheckCircle2 className="w-3 h-3"/>Pilihan Anda</span>}
              <div className="w-24 h-24 rounded-full bg-slate-100 mx-auto overflow-hidden mb-3 border-4 border-sky-100">
                {c.photo ? <img src={c.photo} alt="" className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-3xl font-black text-slate-400">{c.name?.[0]}</div>}
              </div>
              <h3 className="font-heading font-bold text-center">{c.name}</h3>
              <p className="text-xs text-center text-sky-600 font-semibold uppercase mt-0.5">{pos.l}</p>
              <div className="mt-3 space-y-1.5 text-xs">
                <p><b>Visi:</b> {c.vision}</p>
                <p className="line-clamp-2"><b>Misi:</b> {c.mission}</p>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-slate-500">📊 {c.vote_count} suara</span>
                {canManage && <div className="flex gap-1">
                  <button data-testid={`candidate-edit-${c.id}`} onClick={()=>setEditCand(c)} className="p-1.5 text-sky-600 hover:bg-sky-50 rounded-lg"><Pencil className="w-4 h-4"/></button>
                  <button data-testid={`candidate-delete-${c.id}`} onClick={()=>del(c)} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"><Trash2 className="w-4 h-4"/></button>
                </div>}
              </div>
              {isVoter && (
                <button data-testid="osis-vote-candidate-button" disabled={voted || status!=="berlangsung"} onClick={()=>setConfirmCand(c)}
                  className={`mt-3 w-full py-2 rounded-xl font-semibold text-sm ${(voted||status!=="berlangsung")?"bg-slate-200 text-slate-500 cursor-not-allowed":"bg-sky-600 text-white hover:bg-sky-700"}`}>
                  {voted?"Sudah Vote":status!=="berlangsung"?"Pemilihan Ditutup":"Vote Kandidat Ini"}
                </button>
              )}
            </div>;
          })}
        </div>
      </div>;
    })}

    {cands.length===0 && <div className="bg-white p-12 rounded-2xl text-center border">
      <Vote className="w-12 h-12 text-slate-300 mx-auto mb-3"/>
      <p className="text-slate-500">Belum ada kandidat. {canManage && "Tambahkan kandidat baru untuk memulai pemilu."}</p>
    </div>}

    {showNew && <NewCandModal onClose={()=>setShowNew(false)} onDone={()=>{load();setShowNew(false);}}/>}
    {editCand && <NewCandModal initial={editCand} onClose={()=>setEditCand(null)} onDone={()=>{load();setEditCand(null);}}/>}
    {confirmCand && <VoteConfirm cand={confirmCand} onCancel={()=>setConfirmCand(null)} onConfirm={()=>vote(confirmCand)}/>}
  </div>;
}

function VotingBooth({ status, voted, positions }) {
  const done = positions.filter(p => voted.includes(p.v)).length;
  const all = positions.length > 0 && done === positions.length;
  return (
    <div data-testid="voting-booth" className={`rounded-2xl p-5 border-2 flex items-center gap-4 flex-wrap ${all ? "bg-emerald-50 border-emerald-200" : "bg-sky-50 border-sky-200"}`}>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${all ? "bg-emerald-500" : "bg-sky-600"} text-white`}>{all ? <CheckCircle2 className="w-6 h-6"/> : <Vote className="w-6 h-6"/>}</div>
      <div className="flex-1 min-w-[200px]">
        <p className="font-heading font-bold text-slate-900">Bilik Suara Digital</p>
        <p className="text-sm text-slate-600">{status !== "berlangsung" ? "Bilik suara dibuka saat panitia memulai pemilihan." : all ? "Terima kasih! Semua suara Anda sudah tercatat secara rahasia." : "Pilih satu kandidat untuk setiap posisi. Suara tidak dapat diubah setelah dikirim."}</p>
      </div>
      <div className="flex gap-2">
        {positions.map(p => (
          <span key={p.v} data-testid={`booth-progress-${p.v}`} className={`px-3 py-1.5 rounded-full text-xs font-bold ${voted.includes(p.v) ? "bg-emerald-500 text-white" : "bg-white border-2 border-slate-200 text-slate-500"}`}>
            {voted.includes(p.v) ? "✓ " : ""}{p.l}
          </span>
        ))}
      </div>
    </div>
  );
}

function VoteConfirm({ cand, onCancel, onConfirm }) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" data-testid="vote-confirm-modal">
      <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl p-6 text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-sky-600">Konfirmasi Pilihan</p>
        <div className="w-24 h-24 rounded-full bg-slate-100 mx-auto overflow-hidden my-4 border-4 border-sky-100">
          {cand.photo ? <img src={cand.photo} alt="" className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-3xl font-black text-slate-400">{cand.name?.[0]}</div>}
        </div>
        <h3 className="font-heading text-xl font-extrabold">{cand.name}</h3>
        <p className="text-sm text-slate-500 capitalize">Calon {cand.position} OSIS</p>
        <p className="mt-3 text-xs text-amber-700 bg-amber-50 rounded-lg p-2">Suara bersifat rahasia dan tidak dapat diubah.</p>
        <div className="mt-5 flex gap-2">
          <button data-testid="vote-confirm-cancel" onClick={onCancel} className="flex-1 py-2.5 border-2 border-slate-200 rounded-xl font-semibold">Batal</button>
          <button data-testid="vote-confirm-submit" disabled={busy} onClick={async()=>{setBusy(true); await onConfirm();}} className="flex-1 py-2.5 bg-sky-600 text-white rounded-xl font-semibold disabled:opacity-60">{busy ? "Mengirim..." : "Ya, Pilih"}</button>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    belum: { l: "Belum Dimulai", c: "bg-slate-200 text-slate-700" },
    berlangsung: { l: "Sedang Berlangsung", c: "bg-emerald-100 text-emerald-700" },
    selesai: { l: "Selesai", c: "bg-rose-100 text-rose-700" },
  };
  const m = map[status] || map.belum;
  return <span data-testid="election-status-badge" className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${m.c}`}>
    {status === "berlangsung" && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}{m.l}
  </span>;
}

function QuickCount({ stats }) {
  const maxVotes = Math.max(1, ...stats.candidates.map(c => c.vote_count || 0));
  const cards = [
    { l: "Total DPT", v: stats.dpt, c: "from-slate-700 to-slate-900", icon: Users },
    { l: "Suara Masuk", v: stats.voters, c: "from-sky-500 to-sky-600", icon: Vote },
    { l: "Total Vote", v: stats.total_votes, c: "from-indigo-500 to-indigo-600", icon: BarChart3 },
    { l: "Partisipasi", v: `${stats.participation}%`, c: "from-emerald-500 to-emerald-600", icon: Award },
  ];
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4" data-testid="election-quickcount">
      <h2 className="font-heading font-bold text-slate-900 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-sky-600" />Hitung Cepat (Live Count)</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map(x => (
          <div key={x.l} className={`bg-gradient-to-br ${x.c} text-white p-4 rounded-2xl shadow`}>
            <x.icon className="w-5 h-5 opacity-90" />
            <p className="mt-2 font-heading text-2xl font-extrabold" data-testid={`qc-${x.l.toLowerCase().replace(/\s/g, "-")}`}>{x.v}</p>
            <p className="text-[11px] font-semibold uppercase opacity-90">{x.l}</p>
          </div>
        ))}
      </div>
      <div>
        <div className="flex justify-between text-xs text-slate-500 mb-1"><span>Partisipasi Pemilih</span><span>{stats.voters}/{stats.dpt}</span></div>
        <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${Math.min(100, stats.participation)}%` }} /></div>
      </div>
      {stats.candidates.length > 0 && (
        <div className="space-y-2.5">
          <p className="text-xs font-semibold uppercase text-slate-500">Perolehan Suara per Kandidat</p>
          {stats.candidates.map(c => (
            <div key={c.id} data-testid={`qc-candidate-${c.id}`}>
              <div className="flex justify-between text-xs mb-0.5"><span className="font-semibold text-slate-700">{c.name} <span className="text-slate-400">({c.position})</span></span><span className="font-bold text-slate-900">{c.vote_count} suara</span></div>
              <div className="h-3 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 transition-all duration-500" style={{ width: `${((c.vote_count || 0) / maxVotes) * 100}%` }} /></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NewCandModal({onClose,onDone,initial}) {
  const isEdit = !!initial?.id;
  const [f,setF]=useState({name:initial?.name||"",position:initial?.position||"ketua",vision:initial?.vision||"",mission:initial?.mission||"",photo:initial?.photo||""});
  const onFile = e => {
    const fi = e.target.files?.[0]; if (!fi) return;
    const fd = new FormData(); fd.append("file", fi);
    api.post("/upload", fd).then(r => {
      const url = `${process.env.REACT_APP_BACKEND_URL}${r.data.url}`;
      setF({...f, photo: url});
    }).catch(() => toast.error("Gagal upload"));
  };
  return <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4" data-testid="candidate-form-modal">
    <div className="bg-white rounded-2xl max-w-md w-full max-h-[85vh] overflow-y-auto shadow-2xl">
      <div className="flex items-center justify-between p-4 border-b"><h3 className="font-heading font-bold">{isEdit ? "Edit Kandidat" : "Kandidat Baru"}</h3><button onClick={onClose}><X className="w-5 h-5"/></button></div>
      <div className="p-5 space-y-3">
        <input data-testid="candidate-name-input" placeholder="Nama Lengkap" value={f.name} onChange={e=>setF({...f,name:e.target.value})} className="w-full px-3 py-2 border-2 rounded-lg"/>
        <select data-testid="candidate-position-select" value={f.position} onChange={e=>setF({...f,position:e.target.value})} className="w-full px-3 py-2 border-2 rounded-lg">
          {POS.map(p=><option key={p.v} value={p.v}>{p.l}</option>)}
        </select>
        <textarea data-testid="candidate-vision-input" rows={2} placeholder="Visi" value={f.vision} onChange={e=>setF({...f,vision:e.target.value})} className="w-full px-3 py-2 border-2 rounded-lg"/>
        <textarea data-testid="candidate-mission-input" rows={3} placeholder="Misi" value={f.mission} onChange={e=>setF({...f,mission:e.target.value})} className="w-full px-3 py-2 border-2 rounded-lg"/>
        <input data-testid="candidate-photo-input" type="file" accept="image/*" onChange={onFile}/>
        {f.photo && <img src={f.photo} alt="" className="w-20 h-20 object-cover rounded-full mx-auto"/>}
        <button data-testid="candidate-save-button" onClick={async()=>{
            if (!f.name.trim() || !f.vision.trim() || !f.mission.trim()) return toast.error("Nama, visi, dan misi wajib diisi");
            try { if (isEdit) await api.patch(`/candidates/${initial.id}`, f); else await api.post("/candidates",f);
              toast.success(isEdit ? "Kandidat diperbarui" : "Kandidat ditambahkan"); onDone(); }
            catch (e) { toast.error(e.response?.data?.detail || "Gagal menyimpan"); } }}
          className="w-full py-2.5 bg-slate-900 text-white rounded-xl font-semibold">Simpan</button>
      </div>
    </div>
  </div>;
}
