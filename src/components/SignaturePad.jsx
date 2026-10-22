import { useEffect, useRef, useState } from "react";
import { Eraser } from "lucide-react";

export function SignaturePad({ onChange, height = 180 }) {
  const ref = useRef(null);
  const drawing = useRef(false);
  const [empty, setEmpty] = useState(true);

  useEffect(() => {
    const c = ref.current;
    const scale = window.devicePixelRatio || 1;
    c.width = c.offsetWidth * scale; c.height = height * scale;
    const ctx = c.getContext("2d");
    ctx.scale(scale, scale);
    ctx.lineWidth = 2.5; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = "#0B0F17";
  }, [height]);

  const pos = (e) => {
    const r = ref.current.getBoundingClientRect();
    const p = e.touches ? e.touches[0] : e;
    return [p.clientX - r.left, p.clientY - r.top];
  };
  const start = (e) => { e.preventDefault(); drawing.current = true; const ctx = ref.current.getContext("2d"); ctx.beginPath(); ctx.moveTo(...pos(e)); };
  const move = (e) => { if (!drawing.current) return; e.preventDefault(); const ctx = ref.current.getContext("2d"); ctx.lineTo(...pos(e)); ctx.stroke(); setEmpty(false); };
  const end = () => { if (!drawing.current) return; drawing.current = false; onChange?.(ref.current.toDataURL("image/png")); };
  const clear = () => { const c = ref.current; c.getContext("2d").clearRect(0, 0, c.width, c.height); setEmpty(true); onChange?.(null); };

  return (
    <div className="relative">
      <canvas ref={ref} data-testid="signature-canvas" style={{ height }}
        className="w-full rounded-lg bg-white border-2 border-dashed border-slate-500 cursor-crosshair touch-none"
        onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
        onTouchStart={start} onTouchMove={move} onTouchEnd={end} />
      {empty && <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-400 text-sm font-mono uppercase tracking-widest">Sign here</div>}
      <button type="button" data-testid="signature-clear-button" onClick={clear}
        className="absolute top-2 right-2 p-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600" title="Clear">
        <Eraser className="h-4 w-4" />
      </button>
    </div>
  );
}
