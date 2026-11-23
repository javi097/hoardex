import type { WrappedStats } from '@/interfaces/gamification.interface';

/**
 * Sanitiza cadenas de texto para su inclusión segura en documentos XML/SVG,
 * evitando inyecciones o errores de análisis al contener &, <, >, " o '.
 */
export function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Genera un resumen textual formateado con emojis optimizado para portapapeles y redes sociales.
 */
export function generateWrappedShareText(stats: WrappedStats): string {
  const lines: string[] = [
    `✨ Mi Hoardex Wrapped ${stats.year} ✨`,
    `📚 ${stats.totalAdded} ítems añadidos a mi colección`,
    `🏆 ${stats.totalCompleted} completados (${stats.completionRate}% completitud)`,
  ];

  if (stats.favoriteCollection) {
    lines.push(
      `👑 Colección estrella: ${stats.favoriteCollection.collectionName}`
    );
  }

  if (stats.averageRating !== null) {
    lines.push(`⭐ Valoración media: ${stats.averageRating} / 5.0`);
  }

  if (stats.topRatedItems.length > 0) {
    const topTitles = stats.topRatedItems
      .slice(0, 3)
      .map((it) => it.title)
      .join(', ');
    lines.push(`🌟 Mejor puntuados: ${topTitles}`);
  }

  if (stats.longestStreak > 0) {
    lines.push(`🔥 Racha récord: ${stats.longestStreak} días`);
  }

  lines.push(`🎮 Nivel alcanzado: Nivel ${stats.level} (${stats.levelTitle})`);
  lines.push('Descubre y cataloga tus aficiones en https://hoardex.app');

  return lines.join('\n');
}

/**
 * Genera un documento SVG vectorial completo (1080x1350) con la identidad de marca de Hoardex,
 * listo para ser descargado como imagen sin requerir librerías pesadas en cliente.
 */
export function generateWrappedSvg(stats: WrappedStats): string {
  const favColName = stats.favoriteCollection
    ? escapeXml(stats.favoriteCollection.collectionName)
    : 'Sin actividad';
  const favColColor = stats.favoriteCollection?.accentColor ?? '#6366f1';
  const favColItems = stats.favoriteCollection
    ? `${stats.favoriteCollection.itemsCount} ítems (${stats.favoriteCollection.percentage}% de tu catálogo anual)`
    : 'Añade ítems a tus colecciones para desbloquearla';

  const avgRatingText =
    stats.averageRating !== null ? `${stats.averageRating} / 5.0` : 'Sin notas';

  const topItemsSvg =
    stats.topRatedItems.length > 0
      ? stats.topRatedItems
          .slice(0, 3)
          .map((item, idx) => {
            const yPos = 890 + idx * 46;
            const title = escapeXml(item.title);
            const stars = '★'.repeat(Math.min(5, Math.max(1, Math.round(item.rating))));
            return `<text x="120" y="${yPos}" fill="#e2e8f0" font-size="28" font-weight="500">${idx + 1}. ${title} <tspan fill="#fbbf24">${stars}</tspan></text>`;
          })
          .join('\n      ')
      : `<text x="120" y="910" fill="#94a3b8" font-size="28" font-style="italic">Sin ítems puntuados en este año</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1350" width="1080" height="1350">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#090d16" />
      <stop offset="45%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#1e1b4b" />
    </linearGradient>

    <linearGradient id="brandGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#6366f1" />
      <stop offset="100%" stop-color="#a855f7" />
    </linearGradient>

    <linearGradient id="cardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.08" />
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.02" />
    </linearGradient>
  </defs>

  <style>
    .font-base { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
  </style>

  <!-- Fondo base con gradiente inmersivo -->
  <rect width="1080" height="1350" fill="url(#bgGrad)" />

  <!-- Círculos de luz ambiental difuminada -->
  <circle cx="200" cy="180" r="320" fill="#6366f1" opacity="0.18" />
  <circle cx="900" cy="1150" r="380" fill="#a855f7" opacity="0.15" />

  <!-- Cabecera de la tarjeta -->
  <g class="font-base">
    <!-- Píldora de marca -->
    <rect x="80" y="80" width="340" height="54" rx="27" fill="url(#brandGrad)" />
    <text x="250" y="115" fill="#ffffff" font-size="22" font-weight="700" letter-spacing="2" text-anchor="middle">HOARDEX WRAPPED</text>

    <!-- Año y Título -->
    <text x="1000" y="125" fill="#a5b4fc" font-size="44" font-weight="800" text-anchor="end">${stats.year}</text>
    <text x="80" y="195" fill="#ffffff" font-size="46" font-weight="800">Mi Año en Colección</text>
  </g>

  <!-- Bloque 1: Dos tarjetas numéricas (Añadidos y Completados) -->
  <g class="font-base">
    <!-- Tarjeta Añadidos -->
    <rect x="80" y="240" width="440" height="210" rx="24" fill="url(#cardGrad)" stroke="#334155" stroke-width="1.5" />
    <text x="120" y="295" fill="#94a3b8" font-size="22" font-weight="600" letter-spacing="1">ÍTEMS AÑADIDOS</text>
    <text x="120" y="375" fill="#ffffff" font-size="72" font-weight="800">${stats.totalAdded}</text>
    <text x="120" y="415" fill="#a5b4fc" font-size="22">📚 Nuevas incorporaciones</text>

    <!-- Tarjeta Completados -->
    <rect x="560" y="240" width="440" height="210" rx="24" fill="url(#cardGrad)" stroke="#334155" stroke-width="1.5" />
    <text x="600" y="295" fill="#94a3b8" font-size="22" font-weight="600" letter-spacing="1">COMPLETADOS</text>
    <text x="600" y="375" fill="#38bdf8" font-size="72" font-weight="800">${stats.totalCompleted}</text>
    <text x="600" y="415" fill="#bae6fd" font-size="22">🏆 ${stats.completionRate}% de completitud</text>
  </g>

  <!-- Bloque 2: Colección Reina (Favorita) -->
  <g class="font-base">
    <rect x="80" y="480" width="920" height="220" rx="24" fill="url(#cardGrad)" stroke="#334155" stroke-width="1.5" />
    <circle cx="150" cy="590" r="44" fill="${favColColor}" fill-opacity="0.25" stroke="${favColColor}" stroke-width="3" />
    <text x="150" y="602" fill="${favColColor}" font-size="36" text-anchor="middle">👑</text>

    <text x="225" y="545" fill="#fbbf24" font-size="22" font-weight="700" letter-spacing="1">COLECCIÓN REINA DEL AÑO</text>
    <text x="225" y="605" fill="#ffffff" font-size="44" font-weight="800">${favColName}</text>
    <text x="225" y="650" fill="#cbd5e1" font-size="24">${favColItems}</text>
  </g>

  <!-- Bloque 3: Salón de la Fama / Top Ítems y Valoración media -->
  <g class="font-base">
    <rect x="80" y="730" width="920" height="310" rx="24" fill="url(#cardGrad)" stroke="#334155" stroke-width="1.5" />
    <text x="120" y="785" fill="#f43f5e" font-size="22" font-weight="700" letter-spacing="1">TOP TÍTULOS Y NOTAS</text>
    <text x="120" y="830" fill="#ffffff" font-size="34" font-weight="700">Mejor valorados del año</text>

    <text x="960" y="800" fill="#fbbf24" font-size="34" font-weight="800" text-anchor="end">⭐ ${avgRatingText}</text>
    <text x="960" y="835" fill="#94a3b8" font-size="20" text-anchor="end">Media global</text>

    <!-- Lista de top ítems -->
    ${topItemsSvg}
  </g>

  <!-- Bloque 4: Racha y Nivel de Coleccionista -->
  <g class="font-base">
    <rect x="80" y="1070" width="920" height="150" rx="24" fill="url(#cardGrad)" stroke="#334155" stroke-width="1.5" />
    
    <!-- Racha -->
    <text x="120" y="1125" fill="#f97316" font-size="22" font-weight="700" letter-spacing="1">RACHA MÁXIMA</text>
    <text x="120" y="1180" fill="#ffffff" font-size="38" font-weight="800">🔥 ${stats.longestStreak} días consecutivos</text>

    <!-- Nivel -->
    <text x="960" y="1125" fill="#818cf8" font-size="22" font-weight="700" letter-spacing="1" text-anchor="end">RANGO ALCANZADO</text>
    <text x="960" y="1180" fill="#c7d2fe" font-size="36" font-weight="800" text-anchor="end">Nivel ${stats.level} · ${escapeXml(stats.levelTitle)}</text>
  </g>

  <!-- Pie de tarjeta -->
  <g class="font-base">
    <text x="540" y="1290" fill="#64748b" font-size="22" font-weight="500" text-anchor="middle">hoardex.app · Tu colección gamificada</text>
  </g>
</svg>`.trim();
}
