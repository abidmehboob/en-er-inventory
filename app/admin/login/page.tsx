'use client'
import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLoginPage() {
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const result = await signIn('credentials', {
      username: form.get('username'),
      password: form.get('password'),
      redirect: false,
    })
    if (result?.error) {
      setError('Invalid username or password')
    } else {
      router.push('/admin/dashboard')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#f8f4f2' }}>
      <div className="bg-white p-8 rounded-lg shadow w-full max-w-sm" style={{ border: '1px solid #f0e8e4' }}>
        <div className="flex items-center justify-center gap-0 mb-2">
          <span style={{ background: '#c0694a', color: '#fff', fontWeight: 800, fontSize: 22, padding: '5px 10px' }}>EN</span>
          <span style={{ background: '#1a1a2e', color: '#fff', fontWeight: 800, fontSize: 22, padding: '5px 10px' }}>ER</span>
        </div>
        <p className="text-center text-sm mb-6" style={{ color: '#666' }}>Textile Admin Portal</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input name="username" type="text" placeholder="Username" required
            className="w-full border rounded px-3 py-2 text-sm" style={{ borderColor: '#e0d4cc' }} />
          <input name="password" type="password" placeholder="Password" required
            className="w-full border rounded px-3 py-2 text-sm" style={{ borderColor: '#e0d4cc' }} />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button type="submit"
            className="w-full text-white py-2 rounded text-sm font-medium"
            style={{ background: '#c0694a' }}>
            Sign In
          </button>
        </form>
      </div>
    </div>
  )
}
