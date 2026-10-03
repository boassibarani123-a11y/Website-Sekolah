import React, { useState } from "react";
import { User, UserPlus, Pencil, Trash2, Plus } from "lucide-react";

const LEVELS = [
  { bar: "bg-sky-500", ring: "ring-sky-300", pill: "bg-sky-100 text-sky-700" },
  { bar: "bg-indigo-500", ring: "ring-indigo-300", pill: "bg-indigo-100 text-indigo-700" },
  { bar: "bg-emerald-500", ring: "ring-emerald-300", pill: "bg-emerald-100 text-emerald-700" },
  { bar: "bg-amber-500", ring: "ring-amber-300", pill: "bg-amber-100 text-amber-700" },
  { bar: "bg-rose-500", ring: "ring-rose-300", pill: "bg-rose-100 text-rose-700" },
  { bar: "bg-violet-500", ring: "ring-violet-300", pill: "bg-violet-100 text-violet-700" },
];
const lvl = (d) => LEVELS[d % LEVELS.length];

export function buildTree(nodes) {
  const byId = {};
  nodes.forEach(n => (byId[n.id] = { ...n, children: [] }));
  const roots = [];
  nodes.forEach(n => {
    if (n.parent_id && byId[n.parent_id]) byId[n.parent_id].children.push(byId[n.id]);
    else roots.push(byId[n.id]);
  });
  const sortRec = (arr) => { arr.sort((a, b) => (a.order || 0) - (b.order || 0)); arr.forEach(c => sortRec(c.children)); };
  sortRec(roots);
  return roots;
}

function AdminActions({ node, actions }) {
  return (
    <div className="absolute -top-3 right-2 flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
      <button data-testid={`org-edit-${node.id}`} onClick={() => actions.onEdit(node)} title="Edit"
        className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 shadow-sm"><Pencil className="w-3.5 h-3.5" /></button>
      <button data-testid={`org-delete-${node.id}`} onClick={() => actions.onDelete(node)} title="Hapus"
        className="p-1.5 rounded-lg bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 shadow-sm"><Trash2 className="w-3.5 h-3.5" /></button>
    </div>
  );
}

function OrgCard({ node, depth, actions }) {
  const [over, setOver] = useState(false);
  const c = lvl(depth);
  const dnd = actions ? {
    draggable: true,
    onDragStart: (e) => { actions.dragRef.current = node.id; e.stopPropagation(); },
    onDragOver: (e) => { e.preventDefault(); e.stopPropagation(); setOver(true); },
    onDragLeave: () => setOver(false),
    onDrop: (e) => { e.preventDefault(); e.stopPropagation(); setOver(false); actions.onDropNode(node.id); },
  } : {};
  return (
    <div data-testid={`org-node-${node.id}`} {...dnd}
      className={`group relative w-52 bg-white border rounded-2xl px-3 pt-4 pb-3 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-[box-shadow,transform,border-color] ${over ? "border-sky-500 ring-2 ring-sky-200" : "border-slate-200"} ${actions ? "cursor-move" : ""}`}>
      <span className={`absolute top-0 left-4 right-4 h-1.5 rounded-b-full ${c.bar}`} />
      <div className={`mx-auto w-14 h-14 rounded-full overflow-hidden bg-white border border-slate-200 ring-2 ${c.ring} ring-offset-2 flex items-center justify-center`}>
        {node.photo ? <img src={node.photo} alt={node.name} className="w-full h-full object-cover" crossOrigin="anonymous" />
          : <User className="w-6 h-6 text-slate-300" />}
      </div>
      <p className="mt-2 font-heading font-bold text-sm text-slate-900 leading-tight break-words">{node.name}</p>
      <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${c.pill}`}>{node.title}</span>
      <p className="mt-1 text-[10px] text-slate-400">Lapis {depth + 1}{node.dashed ? " · penasihat" : ""}</p>
      {actions && <AdminActions node={node} actions={actions} />}
    </div>
  );
}

export function OrgTreeNode({ node, depth = 0, actions }) {
  const hasKids = node.children.length > 0;
  return (
    <li className={node.dashed ? "dashed" : ""}>
      <OrgCard node={node} depth={depth} actions={actions} />
      {actions && (
        <button data-testid={`org-add-child-${node.id}`} onClick={() => actions.onAdd(node)} title="Tambah bawahan"
          className="org-add-btn relative z-10 mt-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-sky-600 text-white text-[11px] font-semibold shadow hover:bg-sky-700 transition-colors">
          {hasKids ? <Plus className="w-3 h-3" /> : <UserPlus className="w-3 h-3" />}Bawahan
        </button>
      )}
      {hasKids && (
        <ul className={actions ? "has-add" : ""}>
          {node.children.map(ch => React.createElement(OrgTreeNode, { key: ch.id, node: ch, depth: depth + 1, actions }))}
        </ul>
      )}
    </li>
  );
}

export function OrgTree({ tree, actions, testId = "org-tree" }) {
  return (
    <div className="org-tree" data-testid={testId}>
      <ul>{tree.map(n => <OrgTreeNode key={n.id} node={n} depth={0} actions={actions} />)}</ul>
    </div>
  );
}
