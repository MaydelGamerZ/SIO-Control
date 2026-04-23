import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { ExportService } from '../../../../core/services/export.service';
import { InventoryService } from '../../../../core/services/inventory.service';
import { RealtimeService } from '../../../../core/services/realtime.service';
import {
  formatDisplayDate,
  formatNumber,
  inventoryStatuses,
  isInventoryReadOnly,
} from '../../../../core/lib/domain/inventory-core';

@Component({
  selector: 'app-summary-page',
  standalone: false,
  templateUrl: './summary-page.html',
  styleUrl: './summary-page.scss',
})
export class SummaryPage implements OnInit, OnDestroy {
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

  ngOnInit() {
    const source$ = this.auth.canAudit()
      ? this.inventoryService.todayInventory$()
      : this.inventoryService.currentInventoryForUser$('', this.auth.user());

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

  get participants() {
    return (this.inventory()?.userCounts || []).slice().sort((left: any, right: any) => Number(left.order || 0) - Number(right.order || 0));
  }

  get readOnly() {
    return isInventoryReadOnly(this.inventory()?.status);
  }

  async reopenInventory() {
    if (!this.inventory()) {
      return;
    }

    try {
      await this.inventoryService.updateInventoryStatus(this.inventory().id, inventoryStatuses.reopened, this.auth.user());
    } catch (error: any) {
      this.error.set(error.message);
    }
  }

  goTo(path: string) {
    if (!this.inventory()) {
      return;
    }

    void this.router.navigate([path]);
  }
}
