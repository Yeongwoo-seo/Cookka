export interface MenuPerformance {
  id: string;
  menuName: string;
  quantity: number;
  revenue: number;
  cost: number;
  averageCookingTime?: number; // seconds
}

export interface BusinessMetrics {
  todayRevenue: number;
  todayCost: number;
  menuPerformance: MenuPerformance[];
  productionCount: number;
  lastUpdated: Date;
}

export function calculateProfit(metrics: BusinessMetrics): number {
  return metrics.todayRevenue - metrics.todayCost;
}

export function calculateProfitMargin(metrics: BusinessMetrics): number {
  if (metrics.todayRevenue === 0) return 0;
  return (calculateProfit(metrics) / metrics.todayRevenue) * 100;
}

export function calculateMenuProfit(menu: MenuPerformance): number {
  return menu.revenue - menu.cost;
}

export function calculateMenuProfitMargin(menu: MenuPerformance): number {
  if (menu.revenue === 0) return 0;
  return (calculateMenuProfit(menu) / menu.revenue) * 100;
}

// 목업 데이터 제거됨 - Firebase에서 실제 데이터 사용
export const sampleBusinessMetrics: BusinessMetrics = {
  todayRevenue: 0,
  todayCost: 0,
  menuPerformance: [],
  productionCount: 0,
  lastUpdated: new Date(),
};
