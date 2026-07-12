'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'

const links = [
  { href: '/admin/dashboard', label: 'Dashboard' },
  { href: '/admin/inventory', label: 'Inventory' },
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
  return (
    <nav className="w-56 bg-white shadow-sm flex flex-col py-6 px-4" style={{ borderRight: '1px solid #f0e8e4' }}>
      <EnErLogo />
      <ul className="space-y-1 flex-1">
        {links.map(l => (
          <li key={l.href}>
            <Link href={l.href}
              className="block px-3 py-2 rounded text-sm transition-colors"
              style={pathname === l.href
                ? { background: '#c0694a', color: '#fff' }
                : { color: '#333' }}
              onMouseEnter={e => { if (pathname !== l.href) (e.target as HTMLElement).style.background = '#fdf3ef' }}
              onMouseLeave={e => { if (pathname !== l.href) (e.target as HTMLElement).style.background = '' }}>
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
      <button onClick={() => signOut({ callbackUrl: '/login' })}
        className="text-sm text-left px-3 mt-4"
        style={{ color: '#888' }}
        onMouseEnter={e => { (e.target as HTMLElement).style.color = '#c0694a' }}
        onMouseLeave={e => { (e.target as HTMLElement).style.color = '#888' }}>
        Sign out
      </button>
    </nav>
  )
}
