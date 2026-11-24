// Reusable silhouette parts shared across the roster below, so each unit is
// composed from distinct wings / head gear / backpack accessories rather than
// hand duplicating every path per Gundam.

const wingSwept = (main, accent) => (
  <g>
    <path d="M 20 25 L -15 -10 L 5 15 Z" fill={main} />
    <path d="M 20 25 L -25 5 L 0 20 Z" fill={accent} />
    <path d="M 40 25 L 75 -10 L 55 15 Z" fill={main} />
    <path d="M 40 25 L 85 5 L 60 20 Z" fill={accent} />
  </g>
);

const wingSimple = (main) => (
  <g>
    <path d="M 22 24 L -10 -5 L 8 15 Z" fill={main} />
    <path d="M 38 24 L 70 -5 L 52 15 Z" fill={main} />
  </g>
);

const wingBlade = (main, accent) => (
  <g>
    <path d="M 20 25 L -20 -15 L 0 10 L -30 15 L 5 25 Z" fill={main} opacity="0.85" />
    <path d="M 40 25 L 80 -15 L 60 10 L 90 15 L 55 25 Z" fill={main} opacity="0.85" />
    <path d="M 25 20 L 5 -5 L 15 15 Z" fill={accent} />
    <path d="M 35 20 L 55 -5 L 45 15 Z" fill={accent} />
  </g>
);

const wingDual = (main, accent) => (
  <g>
    <path d="M 25 22 L 0 0 L 12 18 Z" fill={main} />
    <path d="M 25 22 L -10 10 L 8 20 Z" fill={accent} />
    <path d="M 35 22 L 60 0 L 48 18 Z" fill={main} />
    <path d="M 35 22 L 70 10 L 52 20 Z" fill={accent} />
  </g>
);

const wingBird = (main, accent) => (
  <g>
    <path d="M 22 24 L -35 -25 L -8 0 L -40 5 L -5 20 Z" fill={main} />
    <path d="M 22 24 L -15 5 L 2 18 Z" fill={accent} />
    <path d="M 38 24 L 95 -25 L 68 0 L 100 5 L 65 20 Z" fill={main} />
    <path d="M 38 24 L 75 5 L 58 18 Z" fill={accent} />
  </g>
);

const wingBinder = (main, accent) => (
  <g>
    <rect x="-10" y="8" width="9" height="22" rx="1" fill={main} transform="rotate(-12 -10 8)" />
    <rect x="61" y="8" width="9" height="22" rx="1" fill={main} transform="rotate(12 61 8)" />
    <circle cx="-6" cy="19" r="2.5" fill={accent} />
    <circle cx="65" cy="19" r="2.5" fill={accent} />
  </g>
);

const hornSingle = (color, tall = false) => (
  <path d={tall ? "M 30 8 L 26 -12 L 34 -12 Z" : "M 30 8 L 27 -4 L 33 -4 Z"} fill={color} />
);

const antennaTwin = (color) => (
  <g>
    <line x1="28" y1="5" x2="23" y2="-9" stroke={color} strokeWidth="1.2" />
    <line x1="32" y1="5" x2="37" y2="-9" stroke={color} strokeWidth="1.2" />
  </g>
);

const beamSaberPack = (color) => (
  <g>
    <rect x="18" y="20" width="3" height="11" fill={color} />
    <rect x="39" y="20" width="3" height="11" fill={color} />
  </g>
);

const gnDrives = (color) => (
  <g>
    <circle cx="25" cy="33" r="3" fill={color} opacity="0.85" />
    <circle cx="35" cy="33" r="3" fill={color} opacity="0.85" />
  </g>
);

const shieldLeft = (main, accent) => (
  <g>
    <polygon points="10,32 20,29 22,42 17,50 8,47" fill={main} />
    <polygon points="12,34 18,32 19,41 16,46 11,44" fill={accent} />
  </g>
);

const funnelPods = (color) => (
  <g>
    <polygon points="6,16 10,19 6,22 2,19" fill={color} />
    <polygon points="54,16 58,19 54,22 50,19" fill={color} />
  </g>
);

const psychoLines = (color) => (
  <g stroke={color} strokeWidth="0.8" opacity="0.9" fill="none">
    <path d="M 25 22 L 30 26 L 35 22" />
    <path d="M 23 36 L 30 40 L 37 36" />
    <path d="M 20 52 L 24 58" />
    <path d="M 40 52 L 36 58" />
  </g>
);

const roundEye = (color) => <circle cx="30" cy="13" r="1.6" fill={color} />;

// The index IS the gundamId, and it is the same index as the project:
// roster unit n belongs to PROJECTS_ARRAY[n]. Units past the project count
// are held in reserve and render only as background sprites until a
// project is added for them. COMBAT_STYLES and UNIT_SPECS are indexed the
// same way — `npm run check` fails if the three lengths differ.
export const GUNDAM_ROSTER = [
  {
    name: "Strike Freedom Gundam",
    thruster: "#0055ff",
    props: {
      chest: "#111", centerChest: "#DAA520", joint: "#DAA520", vfin: "#DAA520",
      foot: "#2340c8", knee: "#f0f0f0", chin: "#c8102e", navy: "#232f6b",
      wings: wingSwept("#0055ff", "#DAA520")
    }
  },
  {
    name: "Mighty Strike Freedom Gundam",
    thruster: "#ff00aa",
    props: {
      chest: "#111", centerChest: "#DAA520", joint: "#DAA520", vfin: "#DAA520",
      wings: (
        <g>
          <path d="M 25 22 L -15 -10 L 5 15 Z" fill="#fff" />
          <path d="M 25 22 L -25 5 L 0 20 Z" fill="#DAA520" />
          <path d="M -15 -10 L -25 5 L 0 20" stroke="#ff00aa" strokeWidth="2" fill="none" opacity="0.8" />
          <path d="M 35 22 L 75 -10 L 55 15 Z" fill="#fff" />
          <path d="M 35 22 L 85 5 L 60 20 Z" fill="#DAA520" />
          <path d="M 75 -10 L 85 5 L 60 20" stroke="#ff00aa" strokeWidth="2" fill="none" opacity="0.8" />
        </g>
      ),
      customParts: funnelPods("#DAA520")
    }
  },
  {
    name: "Rising Freedom Gundam",
    thruster: "#0055ff",
    props: {
      chest: "#111", centerChest: "#0055ff", visor: "#0f0", chin: "#ff0000",
      wings: wingSwept("#0055ff", "#fff")
    }
  },
  {
    name: "Freedom Gundam",
    thruster: "#00bfff",
    props: {
      chest: "#0055ff", centerChest: "#ff0000", waist: "#f0f0f0", vfin: "#DAA520",
      wings: wingSimple("#0055ff")
    }
  },
  {
    name: "Destiny Gundam",
    thruster: "#ff0033",
    props: {
      chest: "#55bbee", centerChest: "#ff0033", visor: "#0f0", foot: "#ff0033",
      wings: wingBlade("#ff0033", "#222")
    }
  },
  {
    name: "Infinite Justice Gundam",
    thruster: "#ff3355",
    // White body with red/gold trim and dark blue boots — the suit is not
    // the all-over pink-red this entry used to specify.
    props: {
      chest: "#e8eaee", centerChest: "#d4232e", headBase: "#e8eaee",
      shoulder: "#e8eaee", shoulderAccent: "#d4232e", arm: "#e8eaee",
      leg: "#e8eaee", waist: "#d4232e", knee: "#d4232e", foot: "#1b2a4a",
      joint: "#c9a227", vfin: "#c9a227", visor: "#0f0", chin: "#c9a227",
      wings: (
        <g>
          <path d="M 25 22 L 5 5 L 15 20 Z" fill="#d0d0d0" />
          <path d="M 35 22 L 55 5 L 45 20 Z" fill="#d0d0d0" />
          <polygon points="15,20 45,20 40,15 20,15" fill="#ff0055" />
        </g>
      ),
      customParts: beamSaberPack("#d0d0d0")
    }
  },
  {
    name: "Infinite Justice Gundam Type II",
    thruster: "#ff2222",
    props: {
      chest: "#222", centerChest: "#c0c0c0", headBase: "#c0c0c0", shoulder: "#c0c0c0",
      shoulderAccent: "#ff0000", arm: "#c0c0c0", leg: "#c0c0c0", joint: "#ff0000",
      visor: "#0f0", chin: "#fff",
      wings: wingDual("#c0c0c0", "#ff0000"),
      customParts: (
        <g>
          {beamSaberPack("#ff0000")}
          {gnDrives("#c0c0c0")}
        </g>
      )
    }
  },
  {
    name: "Justice Gundam",
    thruster: "#ff4422",
    // Red/white with gold trim — the purple scheme this used to carry isn't
    // the ZGMF-X09A's palette.
    props: {
      chest: "#e8eaee", centerChest: "#c9a227", waist: "#b32234", shoulder: "#b32234",
      shoulderAccent: "#e8eaee", arm: "#e8eaee", leg: "#e8eaee",
      knee: "#b32234", foot: "#b32234", joint: "#c9a227", vfin: "#c9a227", visor: "#0f0",
      wings: wingDual("#b32234", "#e8eaee"),
      customParts: beamSaberPack("#c9a227")
    }
  },
  {
    name: "Immortal Justice Gundam",
    thruster: "#ff3355",
    // Shares the Rising Freedom frame: white/blue base carrying Justice's
    // red, rather than the dark purple this used to be.
    props: {
      chest: "#1f3f7a", centerChest: "#d4232e", headBase: "#e8eaee",
      shoulder: "#e8eaee", shoulderAccent: "#d4232e", arm: "#e8eaee", leg: "#e8eaee",
      waist: "#e8eaee", knee: "#d4232e", foot: "#1f3f7a",
      joint: "#c9a227", vfin: "#c9a227", visor: "#0f0",
      wings: wingSwept("#1f3f7a", "#d4232e")
    }
  },
  {
    name: "Eclipse Gundam",
    thruster: "#0055ff",
    props: {
      chest: "#f0f0f0", centerChest: "#0055ff", waist: "#ff0000", hideShoulders: true, hideVfin: true,
      customParts: (
        <g>
          <path d="M 30 9 L 20 0 L 26 8 Z" fill="#DAA520" />
          <path d="M 30 9 L 40 0 L 34 8 Z" fill="#DAA520" />
          <polygon points="28,5 32,5 30,12" fill="#0055ff" />
          <polygon points="12,24 22,24 16,5" fill="#f0f0f0" />
          <polygon points="14,24 20,24 16,10" fill="#0055ff" />
          <polygon points="38,24 48,24 44,5" fill="#f0f0f0" />
          <polygon points="40,24 46,24 44,10" fill="#0055ff" />
        </g>
      )
    }
  },
  {
    name: "Unicorn Gundam",
    thruster: "#66ccff",
    props: {
      chest: "#f0f0f0", centerChest: "#0055ff", waist: "#f0f0f0", joint: "#DAA520",
      hideVfin: true,
      customParts: (
        <g>
          {hornSingle("#DAA520")}
          {psychoLines("#66ccff")}
        </g>
      )
    }
  },
  {
    name: "Unicorn Gundam Final Battle Ver",
    thruster: "#ff2d55",
    // Destroy Mode is WHITE armour with the psycho-frame glowing red
    // through the opened seams — it isn't a black suit.
    props: {
      chest: "#e8eaee", centerChest: "#ff2d55", waist: "#e8eaee", headBase: "#e8eaee",
      shoulder: "#e8eaee", arm: "#e8eaee", leg: "#e8eaee",
      joint: "#ff2d55", knee: "#ff2d55", foot: "#c8ccd4", visor: "#ff8fa3",
      hideVfin: true,
      customParts: (
        <g>
          {hornSingle("#c8ccd4", true)}
          {psychoLines("#ff2d55")}
        </g>
      )
    }
  },
  {
    name: "Unicorn Gundam Perfectibility",
    thruster: "#ffd700",
    props: {
      chest: "#f0f0f0", centerChest: "#DAA520", joint: "#DAA520", hideVfin: true,
      wings: wingBinder("#f0f0f0", "#DAA520"),
      customParts: hornSingle("#DAA520")
    }
  },
  {
    name: "Strike Gundam",
    thruster: "#00bfff",
    props: {
      chest: "#0055ff", centerChest: "#f0f0f0", waist: "#f0f0f0",
      wings: (
        <g>
          <polygon points="20,20 10,10 5,25 15,30" fill="#222" />
          <polygon points="40,20 50,10 55,25 45,30" fill="#222" />
          <polygon points="10,10 5,12 8,25" fill="#ff0000" />
          <polygon points="50,10 55,12 52,25" fill="#ff0000" />
        </g>
      )
    }
  },
  {
    name: "Exia",
    thruster: "#00ffcc",
    // White body with blue and red trim; the GN Drive reads cyan.
    props: {
      hideChest: true, foot: "#1f4fa8", headBase: "#e8eaee",
      shoulder: "#e8eaee", shoulderAccent: "#1f4fa8", arm: "#e8eaee", leg: "#e8eaee",
      waist: "#1f4fa8", knee: "#c1272d", joint: "#5a6070", vfin: "#c9a227", visor: "#00ffcc",
      customParts: (
        <g>
          <polygon points="24,21 36,21 34,30 26,30" fill="#0055ff" />
          <circle cx="30" cy="25" r="4" fill="#00ffcc" />
          <polygon points="26,27 34,27 30,32" fill="#ff0000" />
          <path d="M 12 19 L 5 30" stroke="#00ffcc" strokeWidth="2" opacity="0.7" />
          <path d="M 48 19 L 55 30" stroke="#00ffcc" strokeWidth="2" opacity="0.7" />
        </g>
      )
    }
  },
  {
    name: "Impulse Gundam",
    thruster: "#0099ff",
    props: {
      chest: "#f0f0f0", centerChest: "#ff0000", waist: "#0055ff", shoulder: "#f0f0f0",
      shoulderAccent: "#0055ff", vfin: "#DAA520", visor: "#0f0"
    }
  },
  {
    name: "Wing Gundam Zero EW",
    thruster: "#ffcc00",
    props: {
      chest: "#f0f0f0", centerChest: "#DAA520", joint: "#DAA520", vfin: "#DAA520",
      wings: wingBird("#f0f0f0", "#DAA520")
    }
  },
  {
    name: "Gundam Barbatos",
    thruster: "#ff6600",
    // Off-white nanolaminate armour over an exposed dark gunmetal frame,
    // with orange-red accents — not the purple/tan this used to specify.
    props: {
      chest: "#c8ccd4", centerChest: "#d4442a", waist: "#4a5058", shoulder: "#c8ccd4",
      shoulderAccent: "#6d7480", arm: "#6d7480", leg: "#c8ccd4", knee: "#6d7480",
      foot: "#3a3f47", joint: "#3a3f47", headBase: "#c8ccd4", chin: "#d4442a",
      hideVfin: true,
      customParts: hornSingle("#c8a54a", true)
    }
  },
  {
    name: "RX-78-2 Gundam",
    thruster: "#ff3300",
    props: {
      chest: "#f0f0f0", centerChest: "#ff0000", waist: "#0055ff", shoulder: "#f0f0f0",
      shoulderAccent: "#ff0000", vfin: "#f0f0f0", hideVisor: true,
      customParts: (
        <g>
          {roundEye("#ffcc00")}
          {shieldLeft("#f0f0f0", "#ff0000")}
        </g>
      )
    }
  },
  {
    name: "Astray Gundam",
    thruster: "#ff2200",
    // Red Frame is predominantly RED over a grey inner frame — the body was
    // previously mostly white with red trim, which reads as the wrong suit.
    props: {
      chest: "#c1272d", centerChest: "#e8eaee", joint: "#6d7480", shoulder: "#c1272d",
      shoulderAccent: "#e8eaee", arm: "#c1272d", leg: "#c1272d", waist: "#6d7480",
      knee: "#e8eaee", foot: "#6d7480", headBase: "#e8eaee", vfin: "#c9a227", chin: "#c1272d",
      customParts: (
        <g>
          <path d="M 15 35 L -5 50 L -3 52 L 17 37 Z" fill="#111" />
          <path d="M -5 50 L -15 60 L -14 61 L -3 52 Z" fill="#d0d0d0" />
        </g>
      )
    }
  },
  {
    name: "Gundam 00",
    thruster: "#00ffaa",
    props: {
      chest: "#f0f0f0", centerChest: "#0055ff", waist: "#f0f0f0", hideVfin: true,
      customParts: (
        <g>
          {antennaTwin("#333")}
          {gnDrives("#ff0000")}
        </g>
      )
    }
  },
  {
    name: "Gundam Qan[T]",
    thruster: "#0099ff",
    props: {
      chest: "#f0f0f0", centerChest: "#0055ff", joint: "#DAA520", hideVfin: true,
      wings: wingBinder("#f0f0f0", "#0055ff"),
      customParts: antennaTwin("#DAA520")
    }
  }
];
