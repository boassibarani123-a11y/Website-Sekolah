import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { X, FileSpreadsheet, Download, Upload, CheckCircle2, AlertTriangle, XCircle, Loader2, KeyRound, Users } from "lucide-react";
import api from "@/lib/apiClient";

const DEFAULT_PW = "siswa2026@";
const TONE = { ok: "bg-emerald-100 text-emerald-700", exists: "bg-amber-100 text-amber-700", error: "bg-rose-100 text-rose-700" };
const LABEL = { ok: "Siap dibuat", exists: "Sudah ada", error: "Perlu diperbaiki" };

async function downloadTemplate() {
  try {
    const r = await api.get("/users/import/template", { responseType: "blob" });
    const u = URL.createObjectURL(r.data); const a = document.createElement("a"); a.href = u; a.download = "Template_Impor_Siswa.xlsx"; a.click();
  } catch { toast.error("Gagal mengunduh template"); }
}

function Summary({ s }) {
  const cards = [["Total baris", s.total, "bg-slate-100 text-slate-800", Users], ["Siap dibuat", s.ok, "bg-emerald-50 text-emerald-700", CheckCircle2],
    ["Sudah terdaftar", s.exists, "bg-amber-50 text-amber-700", AlertTriangle], ["Perlu diperbaiki", s.error, "bg-rose-50 text-rose-700", XCircle]];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" data-testid="import-summary">
      {cards.map(([l, v, c, I]) => (
        <div key={l} className={`rounded-2xl p-3 ${c}`}><I className="w-4 h-4" /><p data-testid={`import-sum-${l.split(" ")[0].toLowerCase()}`} className="mt-1 font-heading text-2xl font-extrabold tabular-nums">{v}</p><p className="text-[11px] font-semibold uppercase tracking-wide opacity-80">{l}</p></div>
      ))}
    </div>
  );
}

function PreviewTable({ rows }) {
  const [f, setF] = useState("all");
  const list = useMemo(() => rows.filter(r => f === "all" || r.status === f), [rows, f]);
  return (
    <div>
      <div className="flex gap-1.5 mb-2 flex-wrap">
        {[["all", "Semua"], ["error", "Perlu diperbaiki"], ["exists", "Sudah ada"], ["ok", "Siap dibuat"]].map(([k, l]) => (
          <button key={k} data-testid={`import-filter-${k}`} onClick={() => setF(k)} className={`px-3 py-1 rounded-full text-xs font-semibold ${f === k ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}`}>{l}</button>
        ))}
      </div>
      <div className="max-h-[300px] overflow-auto border border-slate-200 rounded-2xl" data-testid="import-preview-table">
        <table className="w-full text-xs min-w-[720px]">
          <thead className="sticky top-0 bg-slate-50 text-slate-500 uppercase tracking-wider"><tr>
            <th className="px-3 py-2 text-left">Baris</th><th className="px-3 py-2 text-left">Nama</th><th className="px-3 py-2 text-left">Email</th><th className="px-3 py-2 text-left">NISN</th><th className="px-3 py-2 text-left">NIS</th><th className="px-3 py-2 text-left">WA</th><th className="px-3 py-2 text-left">Kelas</th><th className="px-3 py-2 text-left">Status</th></tr></thead>
          <tbody>
            {list.slice(0, 1000).map(r => (
              <tr key={r.row} className="border-t border-slate-100" data-testid={`import-row-${r.row}`}>
                <td className="px-3 py-2 text-slate-400 tabular-nums">{r.row}</td><td className="px-3 py-2 font-semibold text-slate-900">{r.name || "—"}</td>
                <td className="px-3 py-2 text-slate-600">{r.email || "—"}</td><td className="px-3 py-2 font-mono">{r.nisn || "—"}</td><td className="px-3 py-2 font-mono">{r.nis || "—"}</td>
                <td className="px-3 py-2">{r.phone || "—"}</td><td className="px-3 py-2">{r.kelas || "—"}</td>
                <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded-full font-bold ${TONE[r.status]}`}>{LABEL[r.status]}</span>{r.errors?.length > 0 && <p className="mt-1 text-[11px] text-rose-600">{r.errors.join(" · ")}</p>}</td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={8} className="py-8 text-center text-slate-400">Tidak ada baris.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ImportStudentsModal({ kelasOpts, onClose, onDone }) {
  const [file, setFile] = useState(null);
  const [kelas, setKelas] = useState("");
  const [pw, setPw] = useState(DEFAULT_PW);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [emailOn, setEmailOn] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState(false);
  useEffect(() => { api.get("/auth/reset-options").then(r => setEmailOn(!!r.data.email_reset)).catch(() => {}); }, []);
  const form = () => { const fd = new FormData(); fd.append("file", file); fd.append("kelas", kelas); fd.append("password", pw); fd.append("notify_email", notifyEmail ? "1" : ""); return fd; };

  const check = async (f = file) => {
    if (!f) return;
    setBusy(true); setPreview(null);
    const fd = new FormData(); fd.append("file", f); fd.append("kelas", kelas);
    try { const r = await api.post("/admin/students/import/preview", fd); setPreview(r.data); }
    catch (e) { toast.error(e.response?.data?.detail || "Gagal membaca file"); }
    finally { setBusy(false); }
  };
  const run = async () => {
    if (pw.length < 8) return toast.error("Password minimal 8 karakter");
    setBusy(true);
    try { const r = await api.post("/admin/students/import", form(), { timeout: 300000 }); setResult(r.data); toast.success(`${r.data.created} akun siswa berhasil dibuat`); onDone(); }
    catch (e) { toast.error(e.response?.data?.detail || "Impor gagal"); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" data-testid="import-students-modal">
      <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3"><span className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center"><FileSpreadsheet className="w-5 h-5" /></span>
            <div><h3 className="font-heading font-bold text-lg">Impor Siswa dari Excel</h3><p className="text-xs text-slate-500">Satu baris = satu akun siswa · hingga 3.000 siswa per file</p></div></div>
          <button data-testid="import-close" onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 overflow-y-auto space-y-5">
          {result ? (
            <div className="text-center py-6" data-testid="import-result">
              <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto" />
              <p className="mt-3 font-heading text-3xl font-extrabold" data-testid="import-created-count">{result.created} akun dibuat</p>
              <p className="text-slate-500 mt-1">{result.skipped_rows.length} baris dilewati · password semua akun: <b className="font-mono text-slate-900">{pw}</b></p>
              {result.email_queued > 0 && <p data-testid="import-email-queued" className="text-xs text-emerald-700 mt-1">{result.email_queued} email notifikasi akun sedang dikirim di latar belakang.</p>}
              {result.skipped_rows.length > 0 && (
                <div className="mt-5 text-left max-h-56 overflow-auto border border-slate-200 rounded-2xl divide-y" data-testid="import-skipped-list">
                  {result.skipped_rows.map(r => <p key={r.row} className="px-4 py-2 text-xs"><b>Baris {r.row}</b> · {r.name || r.email || "—"} · <span className="text-rose-600">{r.errors.join(" · ")}</span></p>)}
                </div>
              )}
              <button data-testid="import-finish" onClick={onClose} className="mt-6 px-6 py-3 bg-slate-900 text-white rounded-xl font-semibold">Selesai</button>
            </div>
          ) : (<>
            <div className="rounded-2xl bg-sky-50 border border-sky-100 p-4 flex items-start justify-between gap-4 flex-wrap">
              <div className="text-sm text-sky-900"><p className="font-semibold">Kolom yang dibaca:</p><p className="mt-0.5">Nama, Email, NISN, NIS, Nomor WA (dan Kelas bila ada). Urutan kolom bebas, baris pertama harus judul kolom.</p><p className="mt-1 font-semibold" data-testid="import-nis-rule">NIS wajib tepat 5 angka (dipakai untuk verifikasi Face ID).</p></div>
              <button data-testid="import-template-button" onClick={downloadTemplate} className="px-4 py-2 rounded-xl bg-white border border-sky-200 text-sky-700 font-semibold text-sm flex items-center gap-2 hover:border-sky-400"><Download className="w-4 h-4" />Unduh Template</button>
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              <label className="sm:col-span-1 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-200 hover:border-emerald-400 rounded-2xl p-5 cursor-pointer text-center transition-colors" data-testid="import-file-drop">
                <Upload className="w-6 h-6 text-emerald-600" />
                <span className="text-sm font-semibold text-slate-700 break-all">{file ? file.name : "Pilih file .xlsx / .csv"}</span>
                <input data-testid="import-file-input" type="file" accept=".xlsx,.csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; setFile(f || null); if (f) check(f); }} />
              </label>
              <div className="space-y-3 sm:col-span-2">
                <div><label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Kelas (untuk baris tanpa kolom Kelas)</label>
                  <input data-testid="import-kelas-input" list="import-kelas-list" value={kelas} onChange={e => setKelas(e.target.value)} onBlur={() => file && check()} placeholder="mis. X IPA 1"
                    className="w-full mt-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-sky-500" />
                  <datalist id="import-kelas-list">{kelasOpts.map(k => <option key={k} value={k} />)}</datalist></div>
                <div><label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1"><KeyRound className="w-3 h-3" />Password semua akun</label>
                  <input data-testid="import-password-input" value={pw} onChange={e => setPw(e.target.value)} className="w-full mt-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-mono outline-none focus:border-sky-500" /></div>
                <label className={`flex items-center gap-2 text-xs ${emailOn ? "text-slate-700" : "text-slate-400"}`}><input data-testid="import-notify-email" type="checkbox" disabled={!emailOn} checked={notifyEmail} onChange={e => setNotifyEmail(e.target.checked)} className="accent-emerald-600" />Kirim email pemberitahuan akun ke siswa{!emailOn && " (email belum dikonfigurasi)"}</label>
              </div>
            </div>
            {busy && !preview && <p className="text-sm text-slate-500 flex items-center gap-2" data-testid="import-checking"><Loader2 className="w-4 h-4 animate-spin" />Memeriksa data…</p>}
            {preview && <><Summary s={preview.summary} /><PreviewTable rows={preview.rows} /></>}
            {preview?.summary.error > 0 && <p className="text-xs text-rose-600">Baris bermasalah dan yang sudah terdaftar akan dilewati. Perbaiki file lalu unggah ulang bila perlu.</p>}
            <div className="flex justify-end gap-2">
              <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-slate-200 font-semibold text-slate-600">Batal</button>
              <button data-testid="import-submit" disabled={!preview || !preview.summary.ok || busy} onClick={run}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-2 disabled:opacity-40">
                {busy && preview ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}Buat {preview?.summary.ok || 0} Akun</button>
            </div>
          </>)}
        </div>
      </div>
    </div>
  );
}
