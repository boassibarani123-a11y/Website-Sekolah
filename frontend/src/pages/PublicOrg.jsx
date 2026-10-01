import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/apiClient";
import { Network, GraduationCap, ArrowLeft, User } from "lucide-react";

const LEVELS = [
  { bar: "bg-sky-500", ring: "ring-sky-300", grad: "from-sky-50", pill: "bg-sky-100 text-sky-700" },
  { bar: "bg-indigo-500", ring: "ring-indigo-300", grad: "from-indigo-50", pill: "bg-indigo-100 text-indigo-700" },
  { bar: "bg-emerald-500", ring: "ring-emerald-300", grad: "from-emerald-50", pill: "bg-emerald-100 text-emerald-700" },
  { bar: "bg-amber-500", ring: "ring-amber-300", grad: "from-amber-50", pill: "bg-amber-100 text-amber-700" },
  { bar: "bg-rose-500", ring: "ring-rose-300", grad: "from-rose-50", pill: "bg-rose-100 text-rose-700" },
  { bar: "bg-violet-500", ring: "ring-violet-300", grad: "from-violet-50", pill: "bg-violet-100 text-violet-700" },
];
const lvl = (d) => LEVELS[d % LEVELS.length];

function buildTree(nodes) {
  const byId = {};
  nodes.forEach(n => (byId[n.id] = { ...n, children: [] }));
  const roots = [];
  nodes.forEach(n => {
    if (n.parent_id && byId[n.parent_id]) byId[n.parent_id].children.push(byId[n.id]);
    else roots.push(byId[n.id]);
  });
  function sortRec(arr) { arr.sort((a, b) => (a.order || 0) - (b.order || 0)); arr.forEach(c => sortRec(c.children)); }
  sortRec(roots);
  return roots;
}

function OrgNodeView({ node, depth }) {
  const c = lvl(depth);
  return (
    <div className={`ov-item ${node.dashed ? "dashed" : ""}`}>
      <div className={`relative flex items-center gap-3 bg-gradient-to-r ${c.grad} to-white border border-slate-200 rounded-2xl pl-5 pr-4 py-3 mb-4 w-full max-w-md shadow-sm`}>
        <span className={`absolute left-0 top-3 bottom-3 w-1.5 rounded-full ${c.bar}`} />
        <div className={`w-14 h-14 shrink-0 rounded-full overflow-hidden bg-white border border-slate-200 ring-2 ${c.ring} ring-offset-2 flex items-center justify-center`}>
          {node.photo ? <img src={node.photo} alt={node.name} className="w-full h-full object-cover" />
            : <User className="w-6 h-6 text-slate-300" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-heading font-bold text-[15px] text-slate-900 leading-tight truncate">{node.name}</p>
          <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${c.pill}`}>{node.title}</span>
          {node.dashed && <span className="ml-1.5 text-[10px] text-slate-400 italic">penasihat</span>}
        </div>
      </div>
      {node.children.length > 0 && (
        <div className="ov-children">
          {node.children.map(ch => React.createElement(OrgNodeView, { key: ch.id, node: ch, depth: depth + 1 }))}
        </div>
      )}
    </div>
  );
}

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
            <div className="org-vtree" data-testid="public-org-tree">
              <div className="ov-root">{tree.map(n => <OrgNodeView key={n.id} node={n} depth={0} />)}</div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
