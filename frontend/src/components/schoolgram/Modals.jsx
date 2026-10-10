import { useEffect, useState } from "react";
import api from "@/lib/apiClient";
import { toast } from "sonner";
import { X, ImagePlus, Loader2, Tag, Camera } from "lucide-react";
import { Avatar, uploadMedia } from "./shared";

const Shell = ({ title, onClose, children, testid }) => (
  <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 sm:p-4 animate-in fade-in duration-150" onClick={onClose}>
    <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-md w-full max-h-[92vh] overflow-y-auto shadow-2xl animate-in slide-in-from-bottom-6 duration-300" onClick={e => e.stopPropagation()} data-testid={testid}>
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 sticky top-0 bg-white z-10"><h3 className="font-heading text-lg font-bold">{title}</h3><button onClick={onClose}><X className="w-5 h-5" /></button></div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  </div>
);

export function EditProfileModal({ cid, data, onClose, onDone }) {
  const [f, setF] = useState({ description: data.description || "", avatar: data.avatar || "", cover: data.cover || "" });
  const [busy, setBusy] = useState("");
  const pick = async (e, key) => {
    const file = e.target.files?.[0]; if (!file) return;
    setBusy(key);
    try { const m = await uploadMedia(file); setF(s => ({ ...s, [key]: m.url })); } catch { toast.error("Gagal unggah (butuh koneksi internet)"); } finally { setBusy(""); }
  };
  const save = async () => { try { await api.patch(`/schoolgram/class/${cid}/profile`, f); toast.success("Profil kelas diperbarui"); onDone(); } catch (e) { toast.error(e?.response?.data?.detail || "Gagal"); } };
  return (
    <Shell title="Edit Profil Kelas" onClose={onClose} testid="sg-profile-modal">
      <div className="relative rounded-2xl overflow-hidden h-32 bg-gradient-to-br from-sky-500 via-indigo-600 to-fuchsia-600">
        {f.cover && <img src={f.cover} alt="" className="absolute inset-0 w-full h-full object-cover" />}
        <label className="absolute right-2 top-2 px-3 py-1.5 rounded-full bg-black/50 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer backdrop-blur hover:bg-black/70">
          {busy === "cover" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />}Ganti Sampul
          <input data-testid="sg-profile-cover-input" type="file" accept="image/*" onChange={e => pick(e, "cover")} className="hidden" />
        </label>
      </div>
      <div className="flex items-center gap-4 -mt-12 px-2 relative">
        <label className="relative cursor-pointer group">
          <Avatar name={data.name} src={f.avatar} size="w-24 h-24" text="text-3xl" ring="story" />
          <span className="absolute bottom-1 right-1 w-8 h-8 rounded-full bg-sky-600 text-white flex items-center justify-center ring-2 ring-white group-hover:scale-110 transition-transform">
            {busy === "avatar" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
          </span>
          <input data-testid="sg-profile-avatar-input" type="file" accept="image/*" onChange={e => pick(e, "avatar")} className="hidden" />
        </label>
        <p className="text-xs text-slate-500 mt-10">Ketuk foto untuk mengganti. Foto ditampilkan bulat dengan bingkai gradien.</p>
      </div>
      <div>
        <label className="text-xs font-semibold text-slate-600 flex justify-between">Bio / Deskripsi<span className="tabular-nums text-slate-400">{f.description.length}/150</span></label>
        <textarea data-testid="sg-profile-desc" rows={3} maxLength={150} value={f.description} onChange={e => setF({ ...f, description: e.target.value })} placeholder="Ceritakan tentang kelasmu…" className="mt-1 w-full px-3 py-2 border-2 border-slate-200 rounded-xl text-sm focus:border-sky-500 outline-none" />
      </div>
      <button data-testid="sg-profile-save" disabled={!!busy} onClick={save} className="w-full py-3 bg-slate-900 text-white rounded-xl font-semibold disabled:opacity-50">Simpan</button>
    </Shell>
  );
}

export function UploadModal({ title, allowVideo, allowTags, currentClass, onClose, onSubmit }) {
  const [media, setMedia] = useState(null);
  const [caption, setCaption] = useState("");
  const [tags, setTags] = useState([]);
  const [classes, setClasses] = useState([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (allowTags) api.get("/schoolgram/classes").then(r => setClasses(r.data.filter(c => c.name !== currentClass))).catch(() => {}); }, [allowTags, currentClass]);
  const onFile = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    if (f.size > 20 * 1024 * 1024) { toast.error("Maksimal 20MB"); return; }
    setBusy(true);
    try { setMedia(await uploadMedia(f)); } catch { toast.error("Gagal mengunggah (butuh koneksi internet)"); } finally { setBusy(false); }
  };
  const submit = async () => {
    if (!media) { toast.error("Pilih file dulu"); return; }
    setBusy(true);
    try { await onSubmit(media, caption, tags); } catch (e) { toast.error(e?.response?.data?.detail || "Gagal"); } finally { setBusy(false); }
  };
  return (
    <Shell title={title} onClose={onClose} testid="sg-upload-modal">
      <label className={`block rounded-2xl border-2 border-dashed ${media ? "border-transparent" : "border-slate-300 hover:border-sky-400"} overflow-hidden cursor-pointer transition-colors`}>
        {media ? (media.type === "video" ? <video src={media.url} controls className="w-full bg-black max-h-80" /> : <img src={media.url} alt="" className="w-full aspect-square object-cover" />)
          : <div className="py-12 flex flex-col items-center text-slate-400">{busy ? <Loader2 className="w-10 h-10 animate-spin" /> : <ImagePlus className="w-10 h-10" />}<p className="mt-2 text-sm font-semibold">Pilih {allowVideo ? "foto / video" : "foto"}</p><p className="text-[11px]">Maks 20MB{allowVideo ? " · video masuk ke Reels" : ""}</p></div>}
        <input type="file" accept={allowVideo ? "image/*,video/*" : "image/*"} data-testid="sg-upload-file" onChange={onFile} className="hidden" />
      </label>
      <textarea value={caption} onChange={e => setCaption(e.target.value)} rows={2} placeholder="Tulis caption…" data-testid="sg-upload-caption" className="w-full px-3 py-2 border-2 border-slate-200 rounded-xl focus:border-sky-500 outline-none text-sm" />
      {allowTags && classes.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-600 flex items-center gap-1 mb-1.5"><Tag className="w-3.5 h-3.5" />Tandai kelas lain</p>
          <div className="flex flex-wrap gap-1.5">
            {classes.map(c => {
              const on = tags.includes(c.name);
              return <button key={c.id} type="button" data-testid={`sg-tag-${c.id}`} onClick={() => setTags(t => on ? t.filter(x => x !== c.name) : [...t, c.name])}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${on ? "bg-sky-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{c.name}</button>;
            })}
          </div>
        </div>
      )}
      <button data-testid="sg-upload-submit" disabled={busy || !media} onClick={submit} className="w-full py-3 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 disabled:opacity-50">{busy ? "Memproses…" : "Bagikan"}</button>
    </Shell>
  );
}
