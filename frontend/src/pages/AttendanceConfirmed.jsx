import { useSearchParams } from "react-router-dom";
import { GraduationCap, CheckCircle2, AlertTriangle, XCircle, Clock, Info } from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL;
const STATUS_LABEL = { sakit: "Sakit", izin: "Izin", hadir: "Hadir", alpa: "Alpa" };

export default function AttendanceConfirmed() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const result = params.get("result");
  const status = params.get("status") || "";
  const nama = params.get("nama") || "";

  const confirm = (st) => {
    window.location.href = `${API}/api/attendance/confirm?token=${encodeURIComponent(token)}&status=${st}`;
  };

  if (token && !result) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-600 via-sky-700 to-slate-900 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center" data-testid="attendance-confirm-page">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-sky-100 text-sky-600 flex items-center justify-center"><GraduationCap className="w-7 h-7"/></div>
          <h1 className="mt-4 font-heading text-2xl font-extrabold text-slate-900">Konfirmasi Kehadiran</h1>
          <p className="mt-2 text-sm text-slate-500">Kamu belum tercatat hadir hari ini. Pilih alasan ketidakhadiranmu:</p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <button data-testid="confirm-sakit-button" onClick={()=>confirm("sakit")}
              className="py-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold transition-colors">Saya Sakit</button>
            <button data-testid="confirm-izin-button" onClick={()=>confirm("izin")}
              className="py-3.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold transition-colors">Saya Izin</button>
          </div>
          <p className="mt-4 text-[11px] text-slate-400">Hadir di sekolah? Abaikan halaman ini dan segera scan kartu pelajarmu.</p>
        </div>
      </div>
    );
  }

  let icon, title, desc, tone;
  switch (result) {
    case "ok":
      icon = <CheckCircle2 className="w-8 h-8"/>; tone = "bg-emerald-100 text-emerald-600";
      title = "Konfirmasi Berhasil";
      desc = <>Kehadiran{nama ? <> <b>{nama}</b></> : ""} hari ini tercatat sebagai <b>{STATUS_LABEL[status] || status}</b>. Terima kasih sudah memberi kabar.</>;
      break;
    case "used":
      icon = <AlertTriangle className="w-8 h-8"/>; tone = "bg-amber-100 text-amber-600";
      title = "Tautan Sudah Digunakan";
      desc = "Konfirmasi untuk hari ini sudah pernah dikirim. Hubungi wali kelas jika perlu mengubah status.";
      break;
    case "already":
      icon = <Info className="w-8 h-8"/>; tone = "bg-sky-100 text-sky-600";
      title = "Kehadiran Sudah Tercatat";
      desc = <>Kehadiran{nama ? <> <b>{nama}</b></> : ""} hari ini sudah tercatat sebagai <b>{STATUS_LABEL[status] || status}</b>. Tidak ada yang perlu dikonfirmasi.</>;
      break;
    case "expired":
      icon = <Clock className="w-8 h-8"/>; tone = "bg-amber-100 text-amber-600";
      title = "Tautan Kedaluwarsa";
      desc = "Tautan konfirmasi hanya berlaku pada hari yang sama. Hubungi wali kelas untuk mencatat statusmu.";
      break;
    default:
      icon = <XCircle className="w-8 h-8"/>; tone = "bg-rose-100 text-rose-600";
      title = "Tautan Tidak Valid";
      desc = "Tautan konfirmasi tidak dikenali. Minta tautan baru ke wali kelas atau staff TU.";
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-600 via-sky-700 to-slate-900 flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center" data-testid="attendance-confirm-page">
        <div className={`w-14 h-14 mx-auto rounded-2xl flex items-center justify-center ${tone}`}>{icon}</div>
        <h1 className="mt-4 font-heading text-2xl font-extrabold text-slate-900" data-testid="confirm-result-title">{title}</h1>
        <p className="mt-2 text-sm text-slate-500 leading-relaxed" data-testid="confirm-result-desc">{desc}</p>
        <a href="/login" data-testid="confirm-login-link"
          className="mt-6 inline-block px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl transition-colors">Buka Aplikasi</a>
      </div>
    </div>
  );
}
