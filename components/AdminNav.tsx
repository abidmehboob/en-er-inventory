'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'

const links = [
  { href: '/admin/dashboard', label: 'Dashboard' },
  { href: '/admin/inventory', label: 'Inventory' },
  { href: '/admin/new-quotation', label: 'New Quotation' },
  { href: '/admin/orders', label: 'Orders' },
]

export default function AdminNav() {
  const pathname = usePathname()
  return (
    <nav className="w-56 bg-white shadow-sm flex flex-col py-6 px-4">
      <h2 className="font-bold text-lg mb-8 text-blue-700">Qaswa Textile</h2>
      <ul className="space-y-2 flex-1">
        {links.map(l => (
          <li key={l.href}>
            <Link href={l.href}
              className={`block px-3 py-2 rounded text-sm ${pathname === l.href ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}>
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
      <button onClick={() => signOut({ callbackUrl: '/login' })}
        className="text-sm text-gray-500 hover:text-red-600 text-left px-3">
        Sign out
      </button>
    </nav>
  )
}
