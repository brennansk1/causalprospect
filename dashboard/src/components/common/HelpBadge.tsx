import { useEffect, useRef, useState } from 'react'

/**
 * Small circular "i" badge beside a section heading. Click to toggle an
 * anchored popover with a plain-language explanation of what the recruiter
 * is looking at. Click outside or press Escape to dismiss.
 */
export function HelpBadge({ title, body }: { title: string; body: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block', marginLeft: 8 }}>
      <button
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        aria-label={`Help: ${title}`}
        style={{
          width: 16,
          height: 16,
          borderRadius: '50%',
          border: 'none',
          background: open ? 'var(--brand)' : 'var(--bg-subtle)',
          color: open ? '#fff' : 'var(--text-secondary)',
          fontSize: 11,
          fontWeight: 700,
          fontFamily: 'Inter, sans-serif',
          lineHeight: 1,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 120ms',
          padding: 0,
        }}
      >
        i
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            zIndex: 20,
            width: 320,
            background: '#fff',
            border: '1px solid var(--border)',
            borderRadius: 6,
            padding: '10px 12px',
            boxShadow: 'var(--shadow-e3)',
            fontWeight: 400,
          }}
        >
          <div
            style={{
              fontSize: 11,
              letterSpacing: 0.4,
              color: 'var(--brand)',
              textTransform: 'uppercase',
              fontFamily: 'JetBrains Mono, monospace',
              marginBottom: 4,
              fontWeight: 600,
            }}
          >
            {title}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.55 }}>{body}</div>
        </div>
      )}
    </div>
  )
}
