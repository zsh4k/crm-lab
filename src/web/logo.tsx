import { useMemo } from "preact/hooks";

// Logo del CRM: rombo con un laberinto grabado (grooves oscuros sobre el
// gradiente de marca). viewBox 48 → escala a cualquier size.
// El id del gradiente es ÚNICO por instancia para evitar colisiones entre
// varios logos en la página (causaban que el gradiente "se apagara" al
// re-renderizar / cambiar de vista).
let counter = 0;

export function Logo({ size = 20 }: { size?: number }) {
  const gid = useMemo(() => `crmLogoGrad-${++counter}`, []);
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true" class="logo-svg">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#22d3ee" />
          <stop offset="1" stop-color="#a855f7" />
        </linearGradient>
      </defs>
      {/* Rombo */}
      <path d="M24 2 L46 24 L24 46 L2 24 Z" fill={`url(#${gid})`} />
      {/* Laberinto: anillos diamante concéntricos con aperturas alternadas + conectores */}
      <g stroke="#0a0e16" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round" fill="none">
        <path d="M21.6 9.4 L7 24 L24 41 L41 24 L26.4 9.4" />
        <path d="M24 9.4 V13" />
        <path d="M21.9 33.1 L13 24 L24 13 L35 24 L26.1 33.1" />
        <path d="M24 33.1 V30" />
        <path d="M22.4 19.6 L19 24 L24 29 L29 24 L25.6 19.6" />
      </g>
      {/* Núcleo */}
      <path d="M24 21.6 L26.4 24 L24 26.4 L21.6 24 Z" fill="#0a0e16" />
    </svg>
  );
}
