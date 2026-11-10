/**
 * Procedural SVG Avatar Generator for Quick Badge Styles
 * Generates lightweight, crisp vector SVG data URIs for all avatar presets.
 */

export interface AvatarPresetOption {
  id: string;
  label: string;
  category: "role" | "creative" | "color";
  iconName?: string;
  color?: string;
}

export const AVATAR_PRESETS_LIST: AvatarPresetOption[] = [
  { id: "initials", label: "Initials", category: "role" },
  { id: "scholar", label: "Scholar", category: "role" },
  { id: "servant", label: "Civil Officer", category: "role" },
  { id: "topnotcher", label: "Top Ranker", category: "role" },
  { id: "creative", label: "Creative", category: "creative" },
  { id: "robot", label: "Smart Bot", category: "creative" },
  { id: "anime", label: "Anime", category: "creative" },
  { id: "pixel", label: "Pixel Art", category: "creative" },
  { id: "notion", label: "Notionist", category: "creative" },
  { id: "shapes", label: "Shapes", category: "creative" },
  { id: "indigo", label: "Indigo", category: "color", color: "#6366f1" },
  { id: "emerald", label: "Emerald", category: "color", color: "#10b981" },
  { id: "rose", label: "Rose", category: "color", color: "#f43f5e" },
  { id: "amber", label: "Amber", category: "color", color: "#f5a623" },
];

export function generatePresetSvgUrl(
  presetId: string,
  displayName: string = "Reviewer",
  shape: "circle" | "badge" = "circle"
): string {
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() || "")
    .join("") || "R";

  let innerSvg = "";

  switch (presetId) {
    case "scholar":
      innerSvg = `
        <defs>
          <linearGradient id="g-scholar" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#1e293b"/>
            <stop offset="100%" stop-color="#0f172a"/>
          </linearGradient>
          <linearGradient id="g-gold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#fbbf24"/>
            <stop offset="100%" stop-color="#d97706"/>
          </linearGradient>
        </defs>
        <rect width="256" height="256" fill="url(#g-scholar)"/>
        <!-- Cap Diamond -->
        <polygon points="128,52 216,92 128,132 40,92" fill="url(#g-gold)" filter="drop-shadow(0 4px 10px rgba(0,0,0,0.5))"/>
        <!-- Cap Skullcap -->
        <path d="M72,112 C72,168 184,168 184,112 Z" fill="#b45309"/>
        <!-- Tassel -->
        <line x1="128" y1="92" x2="68" y2="134" stroke="#fef08a" stroke-width="4" stroke-linecap="round"/>
        <circle cx="68" cy="138" r="6" fill="#fde047"/>
        <!-- Ribbon / Scroll -->
        <rect x="78" y="184" width="100" height="22" rx="6" fill="#f8fafc"/>
        <rect x="118" y="180" width="20" height="30" rx="3" fill="#ef4444"/>
      `;
      break;

    case "servant":
      innerSvg = `
        <defs>
          <linearGradient id="g-servant" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#0f172a"/>
            <stop offset="100%" stop-color="#1e1b4b"/>
          </linearGradient>
          <linearGradient id="g-pillar" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#f8fafc"/>
            <stop offset="100%" stop-color="#94a3b8"/>
          </linearGradient>
        </defs>
        <rect width="256" height="256" fill="url(#g-servant)"/>
        <!-- Pediment Triangle -->
        <polygon points="128,50 206,94 50,94" fill="#fbbf24"/>
        <circle cx="128" cy="78" r="7" fill="#78350f"/>
        <!-- Architrave -->
        <rect x="46" y="94" width="164" height="12" rx="3" fill="#f59e0b"/>
        <!-- Columns -->
        <rect x="62" y="112" width="20" height="72" rx="4" fill="url(#g-pillar)"/>
        <rect x="100" y="112" width="20" height="72" rx="4" fill="url(#g-pillar)"/>
        <rect x="136" y="112" width="20" height="72" rx="4" fill="url(#g-pillar)"/>
        <rect x="174" y="112" width="20" height="72" rx="4" fill="url(#g-pillar)"/>
        <!-- Base -->
        <rect x="42" y="188" width="172" height="18" rx="4" fill="#f59e0b"/>
      `;
      break;

    case "topnotcher":
      innerSvg = `
        <defs>
          <linearGradient id="g-gold-bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#451a03"/>
            <stop offset="100%" stop-color="#1c1917"/>
          </linearGradient>
          <linearGradient id="g-star" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#fde047"/>
            <stop offset="100%" stop-color="#f59e0b"/>
          </linearGradient>
        </defs>
        <rect width="256" height="256" fill="url(#g-gold-bg)"/>
        <!-- Laurel Wreath Leaves Left -->
        <path d="M68,140 C52,90 92,60 128,48 C100,80 90,120 102,154" fill="none" stroke="#fbbf24" stroke-width="6" stroke-linecap="round"/>
        <!-- Laurel Leaves Right -->
        <path d="M188,140 C204,90 164,60 128,48 C156,80 166,120 154,154" fill="none" stroke="#fbbf24" stroke-width="6" stroke-linecap="round"/>
        <!-- Big Central Star -->
        <polygon points="128,74 140,110 178,110 148,132 160,168 128,146 96,168 108,132 78,110 116,110" fill="url(#g-star)"/>
        <!-- Ribbon Tails -->
        <polygon points="112,180 94,220 120,206 128,180" fill="#dc2626"/>
        <polygon points="144,180 162,220 136,206 128,180" fill="#b91c1c"/>
      `;
      break;

    case "creative":
      innerSvg = `
        <defs>
          <linearGradient id="g-creative" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#4c1d95"/>
            <stop offset="50%" stop-color="#701a75"/>
            <stop offset="100%" stop-color="#831843"/>
          </linearGradient>
        </defs>
        <rect width="256" height="256" fill="url(#g-creative)"/>
        <!-- Palette Wooden Board -->
        <path d="M128,52 C184,52 216,84 216,132 C216,170 190,196 160,196 C144,196 136,182 120,182 C108,182 98,194 86,194 C54,194 40,166 40,128 C40,78 82,52 128,52 Z" fill="#fde68a" stroke="#d97706" stroke-width="5"/>
        <circle cx="172" cy="154" r="14" fill="#4c1d95"/>
        <!-- Paint Blobs -->
        <circle cx="82" cy="100" r="12" fill="#ef4444"/>
        <circle cx="120" cy="80" r="12" fill="#3b82f6"/>
        <circle cx="160" cy="88" r="12" fill="#10b981"/>
        <circle cx="184" cy="118" r="11" fill="#f59e0b"/>
      `;
      break;

    case "robot":
      innerSvg = `
        <defs>
          <linearGradient id="g-robot" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#0f172a"/>
            <stop offset="100%" stop-color="#1e293b"/>
          </linearGradient>
          <linearGradient id="g-bot-face" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#38bdf8"/>
            <stop offset="100%" stop-color="#0284c7"/>
          </linearGradient>
        </defs>
        <rect width="256" height="256" fill="url(#g-robot)"/>
        <!-- Antenna -->
        <circle cx="128" cy="46" r="10" fill="#f59e0b"/>
        <rect x="124" y="56" width="8" height="24" fill="#94a3b8"/>
        <!-- Ears -->
        <rect x="42" y="112" width="14" height="32" rx="4" fill="#f59e0b"/>
        <rect x="200" y="112" width="14" height="32" rx="4" fill="#f59e0b"/>
        <!-- Head -->
        <rect x="52" y="80" width="152" height="114" rx="24" fill="#1e293b" stroke="#38bdf8" stroke-width="4"/>
        <!-- Visor / Eyes Screen -->
        <rect x="68" y="104" width="120" height="42" rx="12" fill="#082f49"/>
        <circle cx="98" cy="125" r="9" fill="#38bdf8"/>
        <circle cx="158" cy="125" r="9" fill="#38bdf8"/>
        <!-- Smile Teeth Grid -->
        <rect x="94" y="160" width="68" height="12" rx="4" fill="#38bdf8" opacity="0.8"/>
      `;
      break;

    case "anime":
      innerSvg = `
        <defs>
          <linearGradient id="g-anime-bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#2e1065"/>
            <stop offset="50%" stop-color="#581c87"/>
            <stop offset="100%" stop-color="#0e7490"/>
          </linearGradient>
          <linearGradient id="g-anime-hair" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#38bdf8"/>
            <stop offset="100%" stop-color="#ec4899"/>
          </linearGradient>
        </defs>
        <rect width="256" height="256" fill="url(#g-anime-bg)"/>
        <!-- Face Silhouette -->
        <polygon points="128,188 78,118 78,82 178,82 178,118" fill="#fde047" opacity="0.9"/>
        <!-- Spiky Hair -->
        <polygon points="60,90 90,44 116,74 148,38 168,70 204,54 186,110 196,150 160,136 128,150 96,136 64,146 72,110" fill="url(#g-anime-hair)"/>
        <!-- Cyber Visor Glasses -->
        <polygon points="86,112 170,112 164,126 92,126" fill="#f43f5e"/>
      `;
      break;

    case "pixel":
      innerSvg = `
        <defs>
          <linearGradient id="g-pixel-bg" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#064e3b"/>
            <stop offset="100%" stop-color="#022c22"/>
          </linearGradient>
        </defs>
        <rect width="256" height="256" fill="url(#g-pixel-bg)"/>
        <!-- 8-Bit Pixel Character Pattern -->
        <rect x="76" y="52" width="104" height="24" fill="#34d399"/>
        <rect x="60" y="76" width="136" height="40" fill="#6ee7b7"/>
        <rect x="76" y="92" width="24" height="20" fill="#064e3b"/>
        <rect x="156" y="92" width="24" height="20" fill="#064e3b"/>
        <rect x="92" y="116" width="72" height="32" fill="#a7f3d0"/>
        <rect x="108" y="136" width="40" height="12" fill="#047857"/>
        <rect x="68" y="152" width="120" height="52" fill="#059669"/>
      `;
      break;

    case "notion":
      innerSvg = `
        <defs>
          <linearGradient id="g-notion" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#18181b"/>
            <stop offset="100%" stop-color="#09090b"/>
          </linearGradient>
        </defs>
        <rect width="256" height="256" fill="url(#g-notion)"/>
        <!-- Head Contour -->
        <circle cx="128" cy="116" r="54" fill="#ffffff" stroke="#e4e4e7" stroke-width="4"/>
        <!-- Glasses -->
        <rect x="96" y="104" width="26" height="22" rx="4" fill="none" stroke="#18181b" stroke-width="4"/>
        <rect x="134" y="104" width="26" height="22" rx="4" fill="none" stroke="#18181b" stroke-width="4"/>
        <line x1="122" y1="115" x2="134" y2="115" stroke="#18181b" stroke-width="4"/>
        <!-- Smile -->
        <path d="M116,142 Q128,152 140,142" fill="none" stroke="#18181b" stroke-width="4" stroke-linecap="round"/>
        <!-- Minimalist Collar -->
        <polygon points="128,170 102,216 154,216" fill="#f4f4f5"/>
      `;
      break;

    case "shapes":
      // PolicyPulse signature abstract shapes avatar (from image_6f6d320c)
      innerSvg = `
        <defs>
          <linearGradient id="g-shapes-bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#082f49"/>
            <stop offset="100%" stop-color="#0c4a6e"/>
          </linearGradient>
        </defs>
        <rect width="256" height="256" fill="url(#g-shapes-bg)"/>
        <!-- Geometric diagonal polygons inspired by PolicyPulse reference -->
        <polygon points="0,0 150,0 50,256 0,256" fill="#38bdf8" opacity="0.85"/>
        <polygon points="80,40 210,90 170,220 40,170" fill="#7dd3fc" opacity="0.9"/>
        <polygon points="110,60 256,120 220,256 70,200" fill="#f8fafc" opacity="0.82"/>
        <polygon points="160,0 256,0 256,180 130,90" fill="#0284c7" opacity="0.75"/>
      `;
      break;

    case "indigo":
      innerSvg = `
        <defs>
          <linearGradient id="g-ind" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#6366f1"/>
            <stop offset="100%" stop-color="#312e81"/>
          </linearGradient>
        </defs>
        <rect width="256" height="256" fill="url(#g-ind)"/>
        <text x="128" y="162" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="96" font-weight="800" fill="#ffffff" text-anchor="middle" letter-spacing="-2px">${initials}</text>
      `;
      break;

    case "emerald":
      innerSvg = `
        <defs>
          <linearGradient id="g-em" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#10b981"/>
            <stop offset="100%" stop-color="#064e3b"/>
          </linearGradient>
        </defs>
        <rect width="256" height="256" fill="url(#g-em)"/>
        <text x="128" y="162" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="96" font-weight="800" fill="#ffffff" text-anchor="middle" letter-spacing="-2px">${initials}</text>
      `;
      break;

    case "rose":
      innerSvg = `
        <defs>
          <linearGradient id="g-rose" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#f43f5e"/>
            <stop offset="100%" stop-color="#881337"/>
          </linearGradient>
        </defs>
        <rect width="256" height="256" fill="url(#g-rose)"/>
        <text x="128" y="162" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="96" font-weight="800" fill="#ffffff" text-anchor="middle" letter-spacing="-2px">${initials}</text>
      `;
      break;

    case "amber":
    case "initials":
    default:
      innerSvg = `
        <defs>
          <linearGradient id="g-amb" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#f59e0b"/>
            <stop offset="100%" stop-color="#78350f"/>
          </linearGradient>
        </defs>
        <rect width="256" height="256" fill="url(#g-amb)"/>
        <text x="128" y="162" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="104" font-weight="800" fill="#ffffff" text-anchor="middle" letter-spacing="-3px">${initials}</text>
      `;
      break;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">${innerSvg}</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
