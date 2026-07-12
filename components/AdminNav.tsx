'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'

const links = [
  { href: '/admin/dashboard', label: 'Dashboard' },
  { href: '/admin/inventory', label: 'Inventory' },
  { href: '/admin/pakistan-stock', label: 'Pakistan Stock' },
  { href: '/admin/new-quotation', label: 'New Quotation' },
  { href: '/admin/orders', label: 'Orders' },
  { href: '/admin/expenses', label: 'Expenses' },
  { href: '/admin/reports', label: 'Reports' },
]

function EnErLogo() {
  return (
    <div className="flex items-center gap-0 mb-8">
      <span style={{ background: '#c0694a', color: '#fff', fontWeight: 800, fontSize: 18, padding: '4px 8px', letterSpacing: 1 }}>EN</span>
      <span style={{ background: '#1a1a2e', color: '#fff', fontWeight: 800, fontSize: 18, padding: '4px 8px', letterSpacing: 1 }}>ER</span>
      <span style={{ color: '#1a1a2e', fontWeight: 700, fontSize: 13, marginLeft: 8, letterSpacing: 0.5 }}>TEXTILE</span>
    </div>
  )
}

export default function AdminNav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        className="fixed top-4 left-4 z-50 md:hidden bg-white rounded shadow p-2"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#1a1a2e" strokeWidth="2">
          <line x1="2" y1="5" x2="18" y2="5" />
          <line x1="2" y1="10" x2="18" y2="10" />
          <line x1="2" y1="15" x2="18" y2="15" />
        </svg>
      </button>

      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar — fixed overlay on mobile, static on desktop */}
      <nav
        className={[
          'fixed inset-y-0 left-0 z-40 w-56 bg-white flex flex-col py-6 px-4 shadow-xl transition-transform duration-200',
          'md:relative md:translate-x-0 md:shadow-sm md:z-auto md:flex-shrink-0',
          open ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
        style={{ borderRight: '1px solid #f0e8e4' }}
      >
        <EnErLogo />
        <ul className="space-y-1 flex-1">
          {links.map(l => (
            <li key={l.href}>
              <Link
                href={l.href}
                onClick={() => setOpen(false)}
                className="block px-3 py-2 rounded text-sm transition-colors"
                style={pathname === l.href
                  ? { background: '#c0694a', color: '#fff' }
                  : { color: '#333' }}
                onMouseEnter={e => { if (pathname !== l.href) (e.target as HTMLElement).style.background = '#fdf3ef' }}
                onMouseLeave={e => { if (pathname !== l.href) (e.target as HTMLElement).style.background = '' }}
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="text-sm text-left px-3 mt-4"
          style={{ color: '#888' }}
          onMouseEnter={e => { (e.target as HTMLElement).style.color = '#c0694a' }}
          onMouseLeave={e => { (e.target as HTMLElement).style.color = '#888' }}
        >
          Sign out
        </button>
      </nav>
    </>
  )
}
