import { useEffect, useRef } from "preact/hooks";
import {
  Chart, LineController, LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip,
} from "chart.js";
import type { Point } from "./charts";

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip);

/**
 * Gráfica de LÍNEA con Chart.js (para comparar contra el SVG a mano).
 *
 * Chart.js pinta en <canvas>, que NO lee CSS variables. Para que respete los
 * 10 temas del CRM, leemos los valores de las CSS vars con getComputedStyle al
 * construir, y un MutationObserver sobre el <style> de <html> re-aplica colores
 * cuando cambia el tema (applyTheme hace root.style.setProperty). Ese trabajo
 * extra es justo lo que el SVG hace gratis.
 */
export function LineChartJs({
  data,
  format = (n) => String(n),
  height = 190,
}: {
  data: Point[];
  format?: (n: number) => string;
  height?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const css = (name: string, fallback: string) =>
      getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;

    // Convierte "#rrggbb" a rgba(...) para poder usar alpha en el relleno del canvas.
    const withAlpha = (hex: string, a: number) => {
      const h = hex.replace("#", "");
      if (h.length !== 6) return hex;
      const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${a})`;
    };

    const readColors = () => ({
      accent: css("--accent", "#22d3ee"),
      txt: css("--txt", "#e5edf7"),
      dim: css("--dim", "#7c8aa3"),
      line: css("--line", "#1f2a3d"),
      panel: css("--panel", "#0f1626"),
    });

    const applyColors = (chart: Chart) => {
      const c = readColors();
      const ds = chart.data.datasets[0] as any;
      ds.borderColor = c.accent;
      ds.pointBackgroundColor = c.panel;
      ds.pointBorderColor = c.accent;
      const area = ctx.createLinearGradient(0, 0, 0, height);
      area.addColorStop(0, withAlpha(c.accent, 0.28));
      area.addColorStop(1, withAlpha(c.accent, 0));
      ds.backgroundColor = area;
      const sc: any = chart.options.scales;
      sc.x.ticks.color = c.dim; sc.x.grid.color = "transparent"; sc.x.border.color = c.line;
      sc.y.ticks.color = c.dim; sc.y.grid.color = withAlpha(c.line, 0.6); sc.y.border.display = false;
      const tip: any = chart.options.plugins!.tooltip;
      tip.backgroundColor = c.panel; tip.borderColor = c.line; tip.titleColor = c.dim; tip.bodyColor = c.txt;
    };

    const chart = new Chart(ctx, {
      type: "line",
      data: {
        labels: data.map((d) => d.label),
        datasets: [{
          data: data.map((d) => d.value),
          fill: true,
          borderWidth: 2,
          tension: 0.35,          // curva suave (diferencia visible vs el SVG recto)
          pointRadius: 3.5,
          pointHoverRadius: 6,
          pointBorderWidth: 2,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: { display: false },   // serie única
          tooltip: {
            borderWidth: 1, padding: 8, displayColors: false,
            callbacks: { label: (item) => format(Number(item.parsed.y)) },
          },
        },
        scales: {
          x: { grid: { display: false }, border: {}, ticks: { font: { size: 10 } } },
          y: {
            beginAtZero: true,
            border: {},
            ticks: { font: { size: 10 }, callback: (v) => format(Number(v)) },
          },
        },
      },
    });
    applyColors(chart);
    chart.update();
    chartRef.current = chart;

    // Re-pintar al cambiar de tema (applyTheme muta el style de <html>).
    const obs = new MutationObserver(() => { applyColors(chart); chart.update(); });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["style"] });

    return () => { obs.disconnect(); chart.destroy(); chartRef.current = null; };
  }, [data, format, height]);

  return (
    <div class="linechart" style={{ position: "relative", height: `${height}px` }}>
      <canvas ref={canvasRef} />
    </div>
  );
}
