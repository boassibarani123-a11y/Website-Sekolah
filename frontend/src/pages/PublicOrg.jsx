import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/apiClient";
import { Network, GraduationCap, ArrowLeft } from "lucide-react";
import { OrgTree, buildTree } from "@/components/OrgTree";
import { useSettings } from "@/context/SettingsContext";

export default function PublicOrg() {
  const { settings } = useSettings();
  const [structures, setStructures] = useState([]);
  const [active, setActive] = useState(null);
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.get("/org-structures/public").then(r => { setStructures(r.data); setActive(r.data[0]?.id || null); if (!r.data.length) setLoading(false); })
      .catch(() => setLoading(false));
  }, []);
  useEffect(() => {
    if (!active) return;
    setLoading(true);
    api.get(`/org/public?structure_id=${active}`).then(r => setNodes(r.data)).finally(() => setLoading(false));
  }, [active]);
  const tree = buildTree(nodes);
  const current = structures.find(s => s.id === active);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-br from-sky-600 via-sky-700 to-slate-900 text-white">
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center border border-white/20 overflow-hidden">
              {settings.school_logo_url ? <img src={settings.school_logo_url} alt="Logo" className="w-full h-full object-contain"/> : <GraduationCap className="w-6 h-6" />}
            </div>
            <div>
              <h1 className="font-heading text-xl font-extrabold tracking-tight">{settings.school_name}</h1>
              <p className="text-[11px] text-sky-100/80">Struktur Organisasi Sekolah</p>
            </div>
          </div>
          <Link to="/login" className="inline-flex items-center gap-1.5 text-sm font-semibold bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg transition-colors">
            <ArrowLeft className="w-4 h-4" />Masuk
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10" data-testid="public-org-page">
        <div className="flex items-center gap-2 mb-6">
          <Network className="w-7 h-7 text-sky-600" />
          <h2 className="font-heading text-3xl font-extrabold text-slate-900">Bagan Organisasi</h2>
        </div>
        {structures.length > 1 && (
          <div className="flex flex-wrap gap-2 mb-6" data-testid="public-org-tabs">
            {structures.map(st => (
              <button key={st.id} data-testid={`public-org-tab-${st.id}`} onClick={() => setActive(st.id)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${active === st.id ? "bg-sky-600 text-white shadow" : "bg-white border border-slate-200 text-slate-600 hover:border-sky-400"}`}>
                {st.name}
              </button>
            ))}
          </div>
        )}
        {loading ? (
          <p className="text-slate-400 py-20 text-center">Memuat struktur...</p>
        ) : tree.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center">
            <Network className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="mt-3 text-slate-500 font-medium">Struktur organisasi belum tersedia.</p>
          </div>
        ) : (
          <div className="bg-gradient-to-b from-slate-50 to-white border border-slate-200 rounded-2xl p-6 shadow-sm overflow-x-auto">
            <div className="rounded-2xl bg-gradient-to-r from-sky-600 via-indigo-600 to-violet-600 px-6 py-5 text-center text-white mb-8">
              <h3 data-testid="public-org-title" className="font-heading text-2xl font-extrabold uppercase">{current?.name}</h3>
              {current?.subtitle && <p className="text-sm text-sky-100/90">{current.subtitle}</p>}
            </div>
            <OrgTree tree={tree} testId="public-org-tree" />
          </div>
        )}
      </main>
    </div>
  );
}
