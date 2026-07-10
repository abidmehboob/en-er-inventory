'use client'
import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-6 text-center">Qaswa Textile</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input name="username" type="text" placeholder="Username" required
            className="w-full border rounded px-3 py-2" />
          <input name="password" type="password" placeholder="Password" required
            className="w-full border rounded px-3 py-2" />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
            Sign In
          </button>
        </form>
      </div>
    </div>
  )
}
