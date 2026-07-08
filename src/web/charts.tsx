import { useRef, useState } from "preact/hooks";

export interface Point {
  label: string;      // etiqueta eje X (ej. "Ene")
  value: number;
}

/**
 * Gráfica de LÍNEA (una sola serie) en SVG a mano.
 * - Responsiva (viewBox + width:100%), sin dependencias.
 * - Usa CSS vars (--accent, --line, --txt, --dim) → cambia con los 10 temas.
 * - Capa de hover: crosshair vertical + tooltip al pasar/tocar.
 * - Serie única: sin leyenda (el título la nombra); último punto etiquetado.
 */
export function LineChart({
  data,
  format = (n) => String(n),
  id = "lc",
  height = 180,
}: {
  data: Point[];
  format?: (n: number) => string;
  id?: string;
  height?: number;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [active, setActive] = useState<number | null>(null);

  const W = 340, H = height;
  const padL = 44, padR = 14, padT = 14, padB = 26;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const max = Math.max(...data.map((d) => d.value), 1);
  const min = Math.min(...data.map((d) => d.value), 0);   // baseline en 0 para magnitudes
  const span = max - min || 1;

  const x = (i: number) => padL + (data.length <= 1 ? plotW / 2 : (i / (data.length - 1)) * plotW);
  const y = (v: number) => padT + plotH - ((v - min) / span) * plotH;

  const pts = data.map((d, i) => ({ ...d, cx: x(i), cy: y(d.value) }));
  const linePath = pts.map((p, i) => `${i ? "L" : "M"}${p.cx.toFixed(1)} ${p.cy.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${pts[pts.length - 1]?.cx.toFixed(1)} ${(padT + plotH).toFixed(1)} L${pts[0]?.cx.toFixed(1)} ${(padT + plotH).toFixed(1)} Z`;

  // 4 líneas de referencia horizontales (grid recesivo) + etiquetas Y.
  const ticks = 4;
  const gridY = Array.from({ length: ticks + 1 }, (_, i) => min + (span * i) / ticks);

  function onMove(e: PointerEvent) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;   // clientX → coords del viewBox
    let best = 0, bestD = Infinity;
    pts.forEach((p, i) => { const d = Math.abs(p.cx - px); if (d < bestD) { bestD = d; best = i; } });
    setActive(best);
  }

  const act = active != null ? pts[active] : null;
  const tipLeftPct = act ? (act.cx / W) * 100 : 0;
  const tipOnRight = tipLeftPct > 60;

  return (
    <div class="linechart" style={{ position: "relative" }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={H}
        preserveAspectRatio="xMidYMid meet"
        onPointerMove={onMove}
        onPointerDown={onMove}
        onPointerLeave={() => setActive(null)}
        style={{ touchAction: "pan-y", display: "block" }}
      >
        <defs>
          <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.28" />
            <stop offset="100%" stop-color="var(--accent)" stop-opacity="0" />
          </linearGradient>
        </defs>

        {/* Grid recesivo + etiquetas Y */}
        {gridY.map((v, i) => (
          <g key={i}>
            <line x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} stroke="var(--line)" stroke-width="1" opacity="0.6" />
            <text x={padL - 8} y={y(v) + 3} text-anchor="end" font-size="9" fill="var(--dim)">{format(v)}</text>
          </g>
        ))}

        {/* Área + línea */}
        {pts.length > 1 && <path d={areaPath} fill={`url(#${id}-fill)`} />}
        <path d={linePath} fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />

        {/* Crosshair del punto activo */}
        {act && <line x1={act.cx} x2={act.cx} y1={padT} y2={padT + plotH} stroke="var(--accent)" stroke-width="1" opacity="0.5" stroke-dasharray="3 3" />}

        {/* Puntos + etiquetas X + área táctil (≥8px) */}
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={p.cx} cy={p.cy} r={active === i ? 5 : 3.5} fill="var(--panel)" stroke="var(--accent)" stroke-width="2" />
            <text x={p.cx} y={H - 8} text-anchor="middle" font-size="9" fill="var(--dim)">{p.label}</text>
            <circle cx={p.cx} cy={p.cy} r="16" fill="transparent" style={{ cursor: "pointer" }} />
          </g>
        ))}

        {/* Etiqueta directa del último punto (serie única).
            Si el punto está muy arriba, la etiqueta va DEBAJO para no cortarse
            contra el borde superior (detalle visto en lupa: pico = máximo). */}
        {!act && pts.length > 0 && (
          <text
            x={pts[pts.length - 1].cx}
            y={pts[pts.length - 1].cy - padT < 12 ? pts[pts.length - 1].cy + 16 : pts[pts.length - 1].cy - 9}
            text-anchor="end" font-size="10" font-weight="700" fill="var(--txt)"
          >
            {format(pts[pts.length - 1].value)}
          </text>
        )}
      </svg>

      {/* Tooltip HTML */}
      {act && (
        <div
          class="lc-tip"
          style={{
            position: "absolute", top: "6px",
            left: tipOnRight ? "auto" : `${tipLeftPct}%`,
            right: tipOnRight ? `${100 - tipLeftPct}%` : "auto",
            transform: tipOnRight ? "translateX(-8px)" : "translateX(8px)",
          }}
        >
          <span class="lc-tip-label">{act.label}</span>
          <span class="lc-tip-value">{format(act.value)}</span>
        </div>
      )}
    </div>
  );
}
