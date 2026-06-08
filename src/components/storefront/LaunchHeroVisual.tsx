/** Decorative B2B textile / catalog visual for the pre-launch page. */
export function LaunchHeroVisual() {
  return (
    <div className="sarjan-launch-visual" aria-hidden>
      <div className="sarjan-launch-visual__orbit sarjan-launch-visual__orbit--one" />
      <div className="sarjan-launch-visual__orbit sarjan-launch-visual__orbit--two" />
      <svg
        className="sarjan-launch-visual__svg"
        viewBox="0 0 420 420"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="sarjanFabric" x1="40" y1="80" x2="380" y2="340">
            <stop offset="0%" stopColor="#8b1f2d" />
            <stop offset="55%" stopColor="#c91e34" />
            <stop offset="100%" stopColor="#6b1228" />
          </linearGradient>
          <linearGradient id="sarjanGold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#e8d5a3" />
            <stop offset="100%" stopColor="#c9a227" />
          </linearGradient>
          <filter id="sarjanGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="12" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Fabric bolt */}
        <ellipse
          cx="210"
          cy="318"
          rx="118"
          ry="22"
          fill="#000"
          opacity="0.35"
        />
        <rect
          x="118"
          y="118"
          width="184"
          height="196"
          rx="28"
          fill="url(#sarjanFabric)"
          filter="url(#sarjanGlow)"
        />
        <path
          d="M148 118h124c8 0 14 6 14 14v168c0 8-6 14-14 14H148c-8 0-14-6-14-14V132c0-8 6-14 14-14z"
          fill="rgba(255,255,255,0.08)"
        />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <line
            key={i}
            x1={138 + i * 28}
            y1="132"
            x2={138 + i * 28}
            y2="296"
            stroke="rgba(245,240,232,0.14)"
            strokeWidth="2"
          />
        ))}

        {/* Roll caps */}
        <ellipse
          cx="210"
          cy="118"
          rx="92"
          ry="26"
          fill="#f5f0e8"
          opacity="0.92"
        />
        <ellipse cx="210" cy="314" rx="92" ry="26" fill="#8b1f2d" />

        {/* Shopping bag — wholesale */}
        <g transform="translate(248 72)">
          <path
            d="M36 44h72l10 118H26L36 44z"
            fill="url(#sarjanGold)"
            opacity="0.95"
          />
          <path
            d="M54 44c0-12 10-22 22-22s22 10 22 22"
            stroke="#f5f0e8"
            strokeWidth="6"
            fill="none"
          />
          <text
            x="72"
            y="108"
            textAnchor="middle"
            fill="#4a3210"
            fontSize="16"
            fontWeight="700"
            fontFamily="system-ui, sans-serif"
          >
            MOQ
          </text>
        </g>

        {/* Sparkles */}
        <circle cx="88" cy="96" r="4" fill="#c9a227" opacity="0.9" />
        <circle cx="332" cy="128" r="3" fill="#f5f0e8" opacity="0.8" />
        <circle cx="356" cy="268" r="5" fill="#c9a227" opacity="0.75" />
        <path d="M72 248l14-8 8 14-14 8-8-14z" fill="#c9a227" opacity="0.55" />
      </svg>

      <div className="sarjan-launch-visual__badge sarjan-launch-visual__badge--one">
        Wholesale catalog
      </div>
      <div className="sarjan-launch-visual__badge sarjan-launch-visual__badge--two">
        B2B ordering
      </div>
      <div className="sarjan-launch-visual__badge sarjan-launch-visual__badge--three">
        Craft textiles
      </div>
    </div>
  );
}
