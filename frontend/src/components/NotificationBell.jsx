import { useEffect, useState } from "react";
import api from "@/lib/apiClient";
import { Bell, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function NotificationBell() {
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const nav = useNavigate();

  const load = () => {
    api.get("/notifications").then(r => { setItems(r.data.items); setUnread(r.data.unread); }).catch(()=>{});
  };
  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, []);
  const markAll = async () => { await api.post("/notifications/read"); load(); };
  const openItem = (n) => { setOpen(false); if (n.link) nav(n.link); };

  return (
    <div className="relative">
      <button data-testid="notification-bell" onClick={()=>{setOpen(!open); if(!open) markAll();}}
        className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors">
        <Bell className="w-5 h-5 text-slate-700"/>
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={()=>setOpen(false)}/>
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-heading font-bold text-slate-900">Notifikasi</h3>
              {items.length > 0 && <button onClick={markAll} className="text-xs text-sky-600 font-semibold flex items-center gap-1"><Check className="w-3 h-3"/>Tandai dibaca</button>}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {items.length === 0 ? (
                <p className="p-8 text-center text-slate-400 text-sm italic">Belum ada notifikasi</p>
              ) : items.map(n => (
                <button key={n.id} onClick={()=>openItem(n)}
                  className={`w-full text-left px-4 py-3 border-b border-slate-100 hover:bg-slate-50 transition-colors ${!n.read ? "bg-sky-50/60" : ""}`}>
                  <p className="text-sm font-semibold text-slate-900">{n.title}</p>
                  <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">{n.body}</p>
                  <p className="text-[10px] text-slate-400 mt-1">{new Date(n.created_at).toLocaleString("id-ID")}</p>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
