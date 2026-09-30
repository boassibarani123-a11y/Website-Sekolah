import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/apiClient";
import { Network, GraduationCap, ArrowLeft, User } from "lucide-react";

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

function OrgNodeView({ node }) {
  return (
    <li className={node.dashed ? "dashed" : ""}>
      <div className="inline-flex flex-col items-center bg-white border-2 border-slate-200 rounded-2xl px-4 py-3 shadow-sm w-44">
        <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center">
          {node.photo ? <img src={node.photo} alt={node.name} className="w-full h-full object-cover" />
            : <User className="w-7 h-7 text-slate-300" />}
        </div>
        <p className="mt-2 font-heading font-bold text-sm text-slate-900 leading-tight">{node.name}</p>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-600 leading-tight mt-0.5">{node.title}</p>
      </div>
      {node.children.length > 0 && (
        <ul>{node.children.map(c => React.createElement(OrgNodeView, { key: c.id, node: c }))}</ul>
      )}
    </li>
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
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm overflow-x-auto">
            <div className="org-tree" data-testid="public-org-tree">
              <ul>{tree.map(n => <OrgNodeView key={n.id} node={n} />)}</ul>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
