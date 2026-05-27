import { ImageResponse } from '@vercel/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const question = params.get('question') || 'Prediction Market'
  const outcome = params.get('outcome') || 'YES'
  const entry = params.get('entry') || '50'
  const current = params.get('current') || '55'
  const profit = params.get('profit') || '+$5.00'
  const shares = params.get('shares') || '10'
  const position = params.get('position') || '$50'
  const username = params.get('username') || 'trader'
  const image = params.get('image') || ''
  const time = params.get('time') || 'Just now'

  const isYes = outcome.toUpperCase() === 'YES'

  return new ImageResponse(
    (
      <div style={{
        width: '1080px',
        height: '1920px',
        display: 'flex',
        flexDirection: 'column',
        background: '#0b000c',
        fontFamily: 'Inter, sans-serif',
        padding: '80px',
        position: 'relative',
      }}>
        {/* Subtle background texture */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(247,32,53,0.02) 0%, transparent 30%)', display: 'flex' }} />

        {/* Red glow */}
        <div style={{ position: 'absolute', top: '-200px', right: '-200px', width: '600px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(247,32,53,0.08) 0%, transparent 70%)', display: 'flex' }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '60px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Logo */}
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#f72035', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: '18px', height: '18px', background: 'white', borderRadius: '3px', transform: 'rotate(45deg)', display: 'flex' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '28px', fontWeight: 700, color: 'white', letterSpacing: '-0.5px' }}>Pulse</span>
              <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.3)', fontWeight: 500 }}>via Polymarket</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '16px', color: 'rgba(255,255,255,0.5)' }}>👤</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '16px', fontWeight: 600, color: 'white' }}>@{username}</span>
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.25)' }}>{time}</span>
            </div>
          </div>
        </div>

        {/* Market image */}
        {image && (
          <div style={{ width: '100%', height: '320px', borderRadius: '32px', overflow: 'hidden', marginBottom: '48px', display: 'flex', border: '1px solid rgba(255,255,255,0.06)' }}>
            <img src={image} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }} />
          </div>
        )}

        {/* Question */}
        <div style={{ marginBottom: '48px', display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '52px', fontWeight: 700, color: 'white', lineHeight: 1.15, letterSpacing: '-1px' }}>
            {question}
          </span>
        </div>

        {/* Trade info card */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '28px',
          padding: '40px',
          marginBottom: '48px',
          gap: '24px',
        }}>
          {/* Outcome badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              padding: '10px 24px',
              borderRadius: '999px',
              background: isYes ? 'rgba(247,32,53,0.1)' : 'rgba(255,255,255,0.05)',
              border: `2px solid ${isYes ? 'rgba(247,32,53,0.3)' : 'rgba(255,255,255,0.1)'}`,
              display: 'flex',
            }}>
              <span style={{ fontSize: '20px', fontWeight: 700, color: isYes ? '#f72035' : 'rgba(255,255,255,0.6)', letterSpacing: '2px' }}>
                {outcome.toUpperCase()}
              </span>
            </div>
            <span style={{ fontSize: '16px', color: 'rgba(255,255,255,0.25)', fontWeight: 500 }}>Position</span>
          </div>

          {/* Stats grid */}
          <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>Entry</span>
              <span style={{ fontSize: '32px', fontWeight: 700, color: 'white' }}>{entry}¢</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>Current</span>
              <span style={{ fontSize: '32px', fontWeight: 700, color: 'white' }}>{current}¢</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>Profit</span>
              <span style={{ fontSize: '32px', fontWeight: 700, color: '#f72035' }}>{profit}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '32px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>Shares</span>
              <span style={{ fontSize: '24px', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>{shares}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>Position</span>
              <span style={{ fontSize: '24px', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>{position}</span>
            </div>
          </div>
        </div>

        {/* Minimal chart line */}
        <div style={{ width: '100%', height: '60px', marginBottom: '48px', display: 'flex', alignItems: 'flex-end', gap: '3px', padding: '0 20px' }}>
          {[30, 35, 32, 40, 38, 45, 50, 48, 55, 58, 52, 60, 63, 65, 62, 68, 71, 70, 73, 75].map((v, i) => (
            <div key={i} style={{ flex: 1, height: `${v}%`, background: i > 15 ? '#f72035' : 'rgba(247,32,53,0.2)', borderRadius: '2px', display: 'flex' }} />
          ))}
        </div>

        {/* Footer */}
        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '16px', color: 'rgba(255,255,255,0.15)', fontWeight: 500 }}>Shared from Pulse</span>
          <span style={{ fontSize: '16px', color: 'rgba(255,255,255,0.25)', fontWeight: 600 }}>pulseswipe.online</span>
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1920,
    }
  )
}
