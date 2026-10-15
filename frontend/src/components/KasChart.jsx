import { useEffect, useState } from "react";
import api from "@/lib/apiClient";
import { BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const MONTH_ID = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const label = (m) => `${MONTH_ID[+m.slice(5, 7) - 1]} ${m.slice(2, 4)}`;
const rupiah = (n) => (n >= 1_000_000 ? `Rp ${(n / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} jt` : `Rp ${(n / 1000).toLocaleString("id-ID", { maximumFractionDigits: 0 })} rb`);

export function KasChart({ classId, refreshKey }) {
  const [months, setMonths] = useState(6);
  const [data, setData] = useState(null);
  useEffect(() => {
    api.get(`/classes/${classId}/kas/chart?months=${months}`).then(r => setData(r.data)).catch(() => setData(null));
  }, [classId, months, refreshKey]);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm" data-testid="kas-chart-card">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="font-heading font-bold flex items-center gap-2"><BarChart3 className="w-5 h-5 text-sky-600" />Grafik Kas per Bulan</h3>
        <select data-testid="kas-chart-months" value={months} onChange={e => setMonths(+e.target.value)} className="px-3 py-1.5 border-2 border-slate-200 rounded-lg text-sm bg-white">
          <option value={3}>3 bulan terakhir</option>
          <option value={6}>6 bulan terakhir</option>
          <option value={12}>12 bulan terakhir</option>
        </select>
      </div>
      {!data ? <p className="mt-4 text-sm text-slate-400">Memuat grafik...</p> : data.every(d => !d.masuk && !d.keluar) ? (
        <p data-testid="kas-chart-empty" className="mt-4 text-sm text-slate-400">Belum ada transaksi pada periode ini.</p>
      ) : (
        <div className="mt-4" style={{ height: 280 }} data-testid="kas-chart">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.map(d => ({ ...d, label: label(d.month) }))} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#94A3B8" />
              <YAxis tickFormatter={rupiah} tick={{ fontSize: 11 }} stroke="#94A3B8" width={70} />
              <Tooltip formatter={(v) => `Rp ${v.toLocaleString("id-ID")}`} />
              <Legend />
              <Bar dataKey="masuk" name="Pemasukan" fill="#10B981" radius={[6, 6, 0, 0]} />
              <Bar dataKey="keluar" name="Pengeluaran" fill="#F43F5E" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
