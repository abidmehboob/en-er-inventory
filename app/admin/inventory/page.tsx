import { readProducts, readReserved } from '@/lib/sheets'
import { calculateAvailable } from '@/lib/stock'
import InventoryTable from '@/components/InventoryTable'

export const dynamic = 'force-dynamic'

export default async function InventoryPage() {
  const [products, reserved] = await Promise.all([readProducts(), readReserved()])
  const withAvailable = calculateAvailable(products, reserved)
  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Inventory</h1>
      <p className="text-gray-500 text-sm mb-6">Edit stock quantities after new arrivals. Minimum sale prices are set in Google Sheets directly.</p>
      <InventoryTable products={withAvailable} />
    </div>
  )
}
