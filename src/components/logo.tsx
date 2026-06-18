'use client'

export function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
      <rect width="512" height="512" rx="96" fill="#0a0a0a"/>
      <rect x="8" y="8" width="496" height="496" rx="88" stroke="#f72035" strokeWidth="6" fill="none" opacity="0.9"/>
      <path d="M80 280 L160 280 L190 200 L230 360 L270 160 L310 380 L340 220 L370 280 L432 280" stroke="#f72035" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  )
}
