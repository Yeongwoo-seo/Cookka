export interface PurchaseHistory {
  id: string;
  quantity: number;
  costPerUnit: number;
  purchaseDate: Date;
}

export interface InventoryItem {
  id: string;
  name: string;
  currentStock: number;
  unit: string;
  costPerUnit: number;
  minimumStock: number;
  expirationDate?: Date;
  location?: string;
  lastUpdated: Date;
  updatedBy?: string;
  purchaseHistory?: PurchaseHistory[]; // 구매 이력 (선택적)
}

export function isLowStock(item: InventoryItem): boolean {
  return item.currentStock <= item.minimumStock;
}

export function isExpiringSoon(item: InventoryItem): boolean {
  if (!item.expirationDate) return false;
  const daysUntilExpiration =
    (item.expirationDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  return daysUntilExpiration <= 3 && daysUntilExpiration >= 0;
}

export function isExpired(item: InventoryItem): boolean {
  if (!item.expirationDate) return false;
  return item.expirationDate.getTime() < Date.now();
}

export const sampleInventory: InventoryItem[] = [
  {
    id: '1',
    name: '밥',
    currentStock: 10.0,
    unit: 'kg',
    costPerUnit: 3000,
    minimumStock: 5.0,
    expirationDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    location: '냉장고 A',
    lastUpdated: new Date(),
  },
  {
    id: '2',
    name: '김치',
    currentStock: 3.0,
    unit: 'kg',
    costPerUnit: 5000,
    minimumStock: 5.0,
    expirationDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    location: '냉장고 B',
    lastUpdated: new Date(),
  },
];
