const mockReadLock = jest.fn()
const mockWriteLock = jest.fn()
jest.mock('@/lib/sheets', () => ({ readLock: mockReadLock, writeLock: mockWriteLock }))

import { acquireLock, releaseLock } from '@/lib/lock'

beforeEach(() => {
  jest.clearAllMocks()
  mockWriteLock.mockResolvedValue(undefined)
})

describe('acquireLock', () => {
  it('acquires when FREE', async () => {
    mockReadLock.mockResolvedValue({ status: 'FREE', locked_at: '' })
    await expect(acquireLock()).resolves.not.toThrow()
    expect(mockWriteLock).toHaveBeenCalledWith('LOCKED', expect.any(String))
  })

  it('throws after max retries when LOCKED and not expired', async () => {
    const recentTime = new Date(Date.now() - 1000).toISOString()
    mockReadLock.mockResolvedValue({ status: 'LOCKED', locked_at: recentTime })
    await expect(acquireLock(3, 10)).rejects.toThrow('Could not acquire lock after retries')
  })

  it('acquires when lock is expired (>10s)', async () => {
    const oldTime = new Date(Date.now() - 15000).toISOString()
    mockReadLock.mockResolvedValue({ status: 'LOCKED', locked_at: oldTime })
    await expect(acquireLock()).resolves.not.toThrow()
    expect(mockWriteLock).toHaveBeenCalledWith('LOCKED', expect.any(String))
  })
})

describe('releaseLock', () => {
  it('writes FREE status', async () => {
    await releaseLock()
    expect(mockWriteLock).toHaveBeenCalledWith('FREE', '')
  })
})
