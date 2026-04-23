import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { ExportService } from '../../../../core/services/export.service';
import { InventoryService } from '../../../../core/services/inventory.service';
import { RealtimeService } from '../../../../core/services/realtime.service';
import {
  formatDisplayDate,
  formatNumber,
  formatTime,
  getProductStatus,
  inventoryStatuses,
  isInventoryReadOnly,
} from '../../../../core/lib/domain/inventory-core';

@Component({
  selector: 'app-inventory-detail-page',
  standalone: false,
  templateUrl: './inventory-detail-page.html',
  styleUrl: './inventory-detail-page.scss',
})
export class InventoryDetailPage implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly subscriptions = new Subscription();

  readonly auth = inject(AuthService);
  readonly exportService = inject(ExportService);
  readonly inventoryService = inject(InventoryService);
  readonly realtime = inject(RealtimeService);

  readonly inventory = signal<any | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly formatDisplayDate = formatDisplayDate;
  readonly formatNumber = formatNumber;
  readonly formatTime = formatTime;
  readonly getProductStatus = getProductStatus;
  readonly inventoryStatuses = inventoryStatuses;

  ngOnInit() {
    const inventoryId = this.route.snapshot.paramMap.get('id') || '';
    const source$ = this.auth.canAudit()
      ? this.inventoryService.inventory$(inventoryId)
      : this.inventoryService.inventoryForUser$(inventoryId, this.auth.user());

    this.subscriptions.add(
      source$.subscribe({
        next: (inventory) => {
          this.inventory.set(inventory);
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

  get readOnly() {
    return isInventoryReadOnly(this.inventory()?.status);
  }

  async changeStatus(status: string) {
    if (!this.inventory()) {
      return;
    }

    try {
      await this.inventoryService.updateInventoryStatus(this.inventory().id, status, this.auth.user());
    } catch (error: any) {
      this.error.set(error.message);
    }
  }

  goTo(path: string) {
    if (!this.inventory()) {
      return;
    }

    const commands = path ? ['/inventario', this.inventory().id, path] : ['/inventario', this.inventory().id];
    void this.router.navigate(commands);
  }
}
