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

// 목업 데이터 제거됨 - Firebase에서 실제 데이터 사용
export const sampleInventory: InventoryItem[] = [];
