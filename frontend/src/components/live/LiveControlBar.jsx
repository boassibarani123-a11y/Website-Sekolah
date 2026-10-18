import { useState } from "react";
import { Mic, MicOff, Video, VideoOff, MonitorUp, Hand, Smile, MessageSquare, PhoneOff, VolumeX, Lock, Unlock, TimerReset, Power } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { REACTIONS } from "./liveUtils";

function Btn({ on, danger, onClick, children, label, testid, disabled }) {
  return (
    <button data-testid={testid} onClick={onClick} disabled={disabled} title={label}
      className={`group relative h-11 min-w-11 px-3 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold
        transition-[background-color,transform,color] duration-200 active:scale-90 disabled:opacity-35 disabled:cursor-not-allowed
        ${danger ? "bg-rose-600 hover:bg-rose-500 text-white" : on ? "bg-white/15 text-white hover:bg-white/20" : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"}`}>
      {children}
      <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-black/80 px-2 py-0.5 text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity">{label}</span>
    </button>
  );
}

function ExtendDialog({ open, onOpenChange, onConfirm, nextSlot }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="live-extend-dialog" className="bg-[#0d1424] border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="font-heading">Perpanjang sesi +5 menit?</DialogTitle>
          <DialogDescription className="text-white/60">
            {nextSlot ? `Mapel berikutnya (${nextSlot.subject}, ${nextSlot.start_time.slice(0, 5)}) tetap mulai tepat waktu, jadi perpanjangan dibatasi sampai jam itu.` : "Tidak ada mapel lain sesudah sesi ini."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <button data-testid="live-extend-cancel" onClick={() => onOpenChange(false)} className="px-4 py-2 rounded-lg bg-white/10 text-sm">Batal</button>
          <button data-testid="live-extend-confirm" onClick={onConfirm} className="px-4 py-2 rounded-lg bg-cyan-500 text-slate-900 font-bold text-sm">Perpanjang</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function LiveControlBar({ media, isHost, isMonitor, hand, onHand, onReact, chatOpen, onChat, onLeave, host, locked, nextSlot }) {
  const [emoji, setEmoji] = useState(false);
  const [extend, setExtend] = useState(false);
  const noMedia = !media.live || isMonitor;
  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 max-w-[calc(100vw-1.5rem)]">
    {emoji && (
      <div data-testid="live-reaction-picker" className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 flex gap-1 p-1.5 rounded-xl bg-[#0b1220]/95 border border-white/10 animate-in fade-in slide-in-from-bottom-2">
        {REACTIONS.map((r) => (
          <button key={r} data-testid={`live-reaction-${r}`} onClick={() => { onReact(r); setEmoji(false); }}
            className="w-9 h-9 rounded-lg text-xl hover:bg-white/10 hover:scale-125 transition-transform">{r}</button>
        ))}
      </div>
    )}
    <div data-testid="live-control-bar"
      className="flex items-center gap-1.5 p-2 rounded-2xl border border-white/10 bg-[#0b1220]/70 backdrop-blur-2xl shadow-2xl shadow-black/50 overflow-x-auto">
      <Btn testid="live-mic-btn" on={media.micOn} disabled={noMedia} onClick={() => media.setMic(!media.micOn)} label={media.micOn ? "Matikan mikrofon" : "Nyalakan mikrofon"}>
        {media.micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5 text-rose-300" />}
      </Btn>
      <Btn testid="live-cam-btn" on={media.camOn} disabled={noMedia} onClick={() => media.setCam(!media.camOn)} label={media.camOn ? "Matikan kamera" : "Nyalakan kamera"}>
        {media.camOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5 text-rose-300" />}
      </Btn>
      {isHost && (
        <Btn testid="live-share-btn" on={media.shareOn} disabled={!media.live} onClick={() => media.setShare(!media.shareOn)} label="Bagikan layar">
          <MonitorUp className={`w-5 h-5 ${media.shareOn ? "text-cyan-300" : ""}`} />
        </Btn>
      )}
      {!isMonitor && (
        <Btn testid="live-hand-btn" on={hand} onClick={onHand} label={hand ? "Turunkan tangan" : "Angkat tangan"}>
          <Hand className={`w-5 h-5 ${hand ? "text-amber-300" : ""}`} />
        </Btn>
      )}
      <Btn testid="live-reaction-btn" on={emoji} onClick={() => setEmoji(!emoji)} label="Reaksi"><Smile className="w-5 h-5" /></Btn>
      <Btn testid="live-chat-toggle" on={chatOpen} onClick={onChat} label="Chat & jadwal"><MessageSquare className="w-5 h-5" /></Btn>
      {isHost && (
        <>
          <span className="w-px h-7 bg-white/10 mx-1" />
          <Btn testid="live-mute-all-btn" onClick={host.muteAll} label="Bisukan semua siswa"><VolumeX className="w-5 h-5" /><span className="hidden lg:inline">Bisukan Semua</span></Btn>
          <Btn testid="live-lock-btn" on={locked} onClick={() => host.lock(!locked)} label={locked ? "Buka kunci ruang" : "Kunci ruang"}>
            {locked ? <Lock className="w-5 h-5 text-amber-300" /> : <Unlock className="w-5 h-5" />}
          </Btn>
          <Btn testid="live-extend-btn" onClick={() => setExtend(true)} label="Perpanjang +5 menit"><TimerReset className="w-5 h-5" /><span className="hidden lg:inline">+5</span></Btn>
          <Btn testid="live-end-btn" onClick={host.end} label="Akhiri sesi untuk semua"><Power className="w-5 h-5 text-rose-300" /></Btn>
        </>
      )}
      <span className="w-px h-7 bg-white/10 mx-1" />
      <Btn testid="live-leave-btn" danger onClick={onLeave} label="Keluar"><PhoneOff className="w-5 h-5" /><span className="hidden sm:inline">Keluar</span></Btn>
    </div>
      <ExtendDialog open={extend} onOpenChange={setExtend} nextSlot={nextSlot} onConfirm={() => { setExtend(false); host.extend(); }} />
    </div>
  );
}
