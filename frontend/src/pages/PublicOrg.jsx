import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/apiClient";
import { Network, GraduationCap, ArrowLeft } from "lucide-react";
import { OrgTree, buildTree } from "@/components/OrgTree";

export default function PublicOrg() {
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.get("/org/public").then(r => setNodes(r.data)).finally(() => setLoading(false)); }, []);
  const tree = buildTree(nodes);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-br from-sky-600 via-sky-700 to-slate-900 text-white">
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center border border-white/20"><GraduationCap className="w-6 h-6" /></div>
            <div>
              <h1 className="font-heading text-xl font-extrabold tracking-tight">SEKOLAHKU</h1>
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
        {loading ? (
          <p className="text-slate-400 py-20 text-center">Memuat struktur...</p>
        ) : tree.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center">
            <Network className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="mt-3 text-slate-500 font-medium">Struktur organisasi belum tersedia.</p>
          </div>
        ) : (
          <div className="bg-gradient-to-b from-slate-50 to-white border border-slate-200 rounded-2xl p-6 shadow-sm overflow-x-auto">
            <OrgTree tree={tree} testId="public-org-tree" />
          </div>
        )}
      </main>
    </div>
  );
}
