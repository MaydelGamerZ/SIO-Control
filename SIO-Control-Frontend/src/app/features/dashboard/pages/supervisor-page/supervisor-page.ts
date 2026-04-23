import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AnalyticsService } from '../../../../core/services/analytics.service';
import { InventoryService } from '../../../../core/services/inventory.service';
import { RealtimeService } from '../../../../core/services/realtime.service';
import { formatDisplayDate, formatNumber, formatTime } from '../../../../core/lib/domain/inventory-core';

@Component({
  selector: 'app-supervisor-page',
  standalone: false,
  templateUrl: './supervisor-page.html',
  styleUrl: './supervisor-page.scss',
})
export class SupervisorPage implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly subscriptions = new Subscription();

  readonly analytics = inject(AnalyticsService);
  readonly inventoryService = inject(InventoryService);
  readonly realtime = inject(RealtimeService);

  readonly inventories = signal<any[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');

  readonly formatDisplayDate = formatDisplayDate;
  readonly formatNumber = formatNumber;
  readonly formatTime = formatTime;

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
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  get rows() {
    return this.analytics.buildSupervisorRows(this.inventories());
  }

  get activeRows() {
    return this.rows.filter((row: any) => !['guardado', 'validado', 'cerrado'].includes(row.status));
  }

  get averageProgress() {
    return this.rows.length
      ? Math.round(this.rows.reduce((total: number, row: any) => total + Number(row.progress || 0), 0) / this.rows.length)
      : 0;
  }

  openInventory(inventoryId: string) {
    void this.router.navigate(['/inventario', inventoryId]);
  }
}
