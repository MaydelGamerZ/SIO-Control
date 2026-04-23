// @ts-nocheck
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { AnalyticsService } from '../../../../core/services/analytics.service';
import { ExportService } from '../../../../core/services/export.service';
import { InventoryService } from '../../../../core/services/inventory.service';
import { RealtimeService } from '../../../../core/services/realtime.service';
import { formatNumber } from '../../../../core/lib/domain/inventory-core';

@Component({
  selector: 'app-reports-page',
  standalone: false,
  templateUrl: './reports-page.html',
  styleUrl: './reports-page.scss',
})
export class ReportsPage implements OnInit, OnDestroy {
  private readonly subscriptions = new Subscription();

  readonly auth = inject(AuthService);
  readonly analytics = inject(AnalyticsService);
  readonly exportService = inject(ExportService);
  readonly inventoryService = inject(InventoryService);
  readonly realtime = inject(RealtimeService);

  readonly inventories = signal<any[]>([]);
  readonly logs = signal<any[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly formatNumber = formatNumber;

  ngOnInit() {
    this.subscriptions.add(
      this.inventoryService.inventories$().subscribe({
        next: (inventories) => {
          this.inventories.set(inventories);
          this.loading.set(false);
          this.error.set('');
        },
        error: (error) => {
          this.error.set(error.message);
          this.loading.set(false);
        },
      }),
    );

    this.subscriptions.add(this.inventoryService.auditLogs$(this.auth.user()).subscribe((logs) => this.logs.set(logs)));
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  get insights() {
    return this.analytics.buildProductInsights(this.inventories());
  }

  get performance() {
    return this.analytics.buildUserPerformance(this.inventories(), this.logs());
  }

  get timeline() {
    return this.analytics.buildInventoryTimeline(this.inventories());
  }

  get differenceRows(): any[] {
    return this.insights.differences as any[];
  }

  get totalDifferences() {
    return this.insights.differences.reduce((total: number, row: any) => total + Math.abs(Number(row.product.difference || 0)), 0);
  }

  get totalErrors() {
    return this.performance.reduce((total: number, row: any) => total + Number(row.errors || 0), 0);
  }

  get averageEfficiency() {
    return this.performance.length
      ? Math.round(this.performance.reduce((total: number, row: any) => total + Number(row.efficiency || 0), 0) / this.performance.length)
      : 0;
  }
}
