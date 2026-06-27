'use client'

/**
 * PULSE wordmark logo — yellow-green on black
 * Used as the brand identity in headers and wherever the logo appears.
 * No icon, just the wordmark.
 */
export function Logo({ size = 28 }: { size?: number }) {
  // The wordmark scales with size height
  const h = size
  const w = h * 3.2 // approximate aspect ratio of "PULSE"

  return (
    <span
      style={{
        fontSize: `${size * 0.75}px`,
        fontWeight: 900,
        fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
        letterSpacing: '0.15em',
        color: '#C8F000',
        textTransform: 'uppercase',
        lineHeight: 1,
        display: 'inline-block',
        flexShrink: 0,
      }}
    >
      PULSE
    </span>
  )
}
