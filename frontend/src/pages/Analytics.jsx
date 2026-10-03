import { useEffect, useState } from "react";
import api from "@/lib/apiClient";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend, Cell } from "recharts";
import { TrendingUp, Award, PieChart as PieIcon } from "lucide-react";

export default function Analytics() {
  const [data, setData] = useState(null);
  useEffect(() => { api.get("/analytics/kepsek").then(r => setData(r.data)); }, []);
  if (!data) return <div className="p-8 text-slate-400">Memuat analitik...</div>;

  const BUCKET_COLORS = ["#EF4444", "#F59E0B", "#38BDF8", "#10B981"];

  return (
    <div className="space-y-6" data-testid="analytics-page">
      <div>
        <h1 className="font-heading text-3xl font-extrabold text-slate-900">📊 Dashboard Analitik</h1>
        <p className="mt-1 text-sm text-slate-500">Ringkasan performa sekolah untuk Kepala Sekolah</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h2 className="font-heading font-bold text-slate-900 flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-sky-600"/>Tren Presensi 7 Hari Terakhir
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data.trend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0"/>
            <XAxis dataKey="date" tick={{fontSize:11}} tickFormatter={d=>d.slice(5)}/>
            <YAxis tick={{fontSize:11}}/>
            <Tooltip contentStyle={{borderRadius:12, border:"1px solid #E2E8F0"}}/>
            <Legend/>
            <Line type="monotone" dataKey="hadir" stroke="#10B981" strokeWidth={2}/>
            <Line type="monotone" dataKey="izin" stroke="#0EA5E9" strokeWidth={2}/>
            <Line type="monotone" dataKey="sakit" stroke="#F59E0B" strokeWidth={2}/>
            <Line type="monotone" dataKey="alpa" stroke="#EF4444" strokeWidth={2}/>
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h2 className="font-heading font-bold text-slate-900 flex items-center gap-2 mb-4">
            <PieIcon className="w-5 h-5 text-sky-600"/>Distribusi Nilai Mini-Quiz
          </h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.quiz_distribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0"/>
              <XAxis dataKey="range" tick={{fontSize:12}}/>
              <YAxis tick={{fontSize:11}}/>
              <Tooltip contentStyle={{borderRadius:12}}/>
              <Bar dataKey="count" radius={[8,8,0,0]}>
                {data.quiz_distribution.map((_, i) => <Cell key={i} fill={BUCKET_COLORS[i]}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h2 className="font-heading font-bold text-slate-900 flex items-center gap-2 mb-4">
            <Award className="w-5 h-5 text-amber-500"/>Ranking Kelas Paling Aktif
          </h2>
          {data.class_ranking.length === 0 ? (
            <p className="text-sm text-slate-400 italic">Belum ada aktivitas yang tercatat.</p>
          ) : (
            <div className="space-y-2">
              {data.class_ranking.map((c, i) => (
                <div key={c.kelas} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                  <span className={`w-8 h-8 rounded-full font-black text-sm flex items-center justify-center border-2 border-white shadow ${i===0?"bg-amber-400":i===1?"bg-slate-300":i===2?"bg-amber-700 text-white":"bg-slate-100 text-slate-600"}`}>{i+1}</span>
                  <p className="flex-1 font-semibold text-sm text-slate-900">{c.kelas}</p>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-sky-500 to-sky-700" style={{width: `${Math.min(100, (c.score / (data.class_ranking[0]?.score || 1)) * 100)}%`}}/>
                    </div>
                    <span className="font-mono-alt text-xs font-bold text-slate-700 w-8 text-right">{c.score}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
