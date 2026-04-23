// @ts-nocheck
import { Injectable } from '@angular/core';
import {
  actionLabel,
  buildDashboardMetrics,
  buildInventoryAlerts,
  buildInventoryTimeline,
  buildProductInsights,
  buildRecentActivity,
  buildSupervisorRows,
  buildUserPerformance,
} from '../lib/data/analytics.repository';

@Injectable({
  providedIn: 'root',
})
export class AnalyticsService {
  actionLabel(action: string) {
    return actionLabel(action);
  }

  buildDashboardMetrics(inventories: any[] = [], users: any[] = []) {
    return buildDashboardMetrics(inventories, users);
  }

  buildInventoryAlerts(inventories: any[] = [], users: any[] = []) {
    return buildInventoryAlerts(inventories, users);
  }

  buildInventoryTimeline(inventories: any[] = []) {
    return buildInventoryTimeline(inventories);
  }

  buildProductInsights(inventories: any[] = []) {
    return buildProductInsights(inventories);
  }

  buildRecentActivity(inventories: any[] = [], logs: any[] = []) {
    return buildRecentActivity(inventories, logs);
  }

  buildSupervisorRows(inventories: any[] = []) {
    return buildSupervisorRows(inventories);
  }

  buildUserPerformance(inventories: any[] = [], logs: any[] = []) {
    return buildUserPerformance(inventories, logs);
  }
}
