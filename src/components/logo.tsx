'use client'

export function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="flex-shrink-0"
    >
      <defs>
        <linearGradient id="logoGrad" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f97066"/>
          <stop offset="50%" stopColor="#e879a8"/>
          <stop offset="100%" stopColor="#8b5cf6"/>
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="112" fill="url(#logoGrad)"/>
      <path
        d="M310 130 C330 130 345 145 345 160 L345 180 L270 240 L345 300 L345 352 C345 367 330 382 310 382 L290 382 C270 382 258 370 258 352 L258 332 L333 272 L258 212 L258 160 C258 145 270 130 290 130 Z"
        fill="white"
        fillOpacity="0.95"
      />
      <path
        d="M202 130 C182 130 167 145 167 160 L167 180 L242 240 L167 300 L167 352 C167 367 182 382 202 382 L222 382 C242 382 254 370 254 352 L254 332 L179 272 L254 212 L254 160 C254 145 242 130 222 130 Z"
        fill="white"
        fillOpacity="0.7"
      />
    </svg>
  )
}
