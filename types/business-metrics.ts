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

export const sampleBusinessMetrics: BusinessMetrics = {
  todayRevenue: 500000,
  todayCost: 300000,
  menuPerformance: [
    {
      id: '1',
      menuName: '김치볶음밥',
      quantity: 50,
      revenue: 250000,
      cost: 150000,
      averageCookingTime: 30 * 60, // 30 minutes
    },
  ],
  productionCount: 50,
  lastUpdated: new Date(),
};
