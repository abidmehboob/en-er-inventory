import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import AdminNav from '@/components/AdminNav'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  return (
    <div className="flex flex-col md:flex-row min-h-screen" style={{ background: '#f8f4f2' }}>
      <AdminNav />
      <main className="flex-1 p-4 pt-16 md:p-8 md:pt-8 min-w-0">{children}</main>
    </div>
  )
}
