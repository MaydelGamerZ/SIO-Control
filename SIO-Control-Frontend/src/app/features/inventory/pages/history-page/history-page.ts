import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { ExportService } from '../../../../core/services/export.service';
import { InventoryService } from '../../../../core/services/inventory.service';
import { RealtimeService } from '../../../../core/services/realtime.service';
import { formatDisplayDate, formatNumber, inventoryStatuses } from '../../../../core/lib/domain/inventory-core';

@Component({
  selector: 'app-history-page',
  standalone: false,
  templateUrl: './history-page.html',
  styleUrl: './history-page.scss',
})
export class HistoryPage implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly subscriptions = new Subscription();

  readonly auth = inject(AuthService);
  readonly exportService = inject(ExportService);
  readonly inventoryService = inject(InventoryService);
  readonly realtime = inject(RealtimeService);

  readonly inventories = signal<any[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly dateFilter = signal('');
  readonly cedisFilter = signal('');
  readonly statusFilter = signal('all');
  readonly textFilter = signal('');
  readonly formatDisplayDate = formatDisplayDate;
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
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  get statuses() {
    return Array.from(new Set(this.inventories().map((inventory) => inventory.status).filter(Boolean))).sort();
  }

  get filteredInventories() {
    return this.inventories().filter((inventory) => {
      const participantText = (inventory.participants || []).map((participant: any) => `${participant.userName} ${participant.userEmail}`).join(' ');
      const haystack = `${inventory.semana} ${inventory.cedis} ${inventory.status} ${participantText}`.toLowerCase();
      const matchesDate = !this.dateFilter() || inventory.dateKey === this.dateFilter();
      const matchesCedis = !this.cedisFilter() || inventory.cedis?.toLowerCase().includes(this.cedisFilter().toLowerCase());
      const matchesStatus = this.statusFilter() === 'all' || inventory.status === this.statusFilter();
      const matchesText = !this.textFilter() || haystack.includes(this.textFilter().toLowerCase());
      return matchesDate && matchesCedis && matchesStatus && matchesText;
    });
  }

  get summary() {
    return {
      difference: this.filteredInventories.reduce((total, inventory) => total + Number(inventory.finalCount?.difference ?? inventory.difference ?? 0), 0),
      products: this.filteredInventories.reduce((total, inventory) => total + Number(inventory.totalProducts || 0), 0),
      totalCounted: this.filteredInventories.reduce((total, inventory) => total + Number(inventory.finalCount?.totalCounted ?? inventory.totalCounted ?? 0), 0),
      validated: this.filteredInventories.filter((inventory) => ['validado', 'cerrado'].includes(inventory.status)).length,
    };
  }

  async reopenInventory(inventoryId: string) {
    try {
      await this.inventoryService.updateInventoryStatus(inventoryId, inventoryStatuses.reopened, this.auth.user());
    } catch (error: any) {
      this.error.set(error.message);
    }
  }

  goToInventory(inventoryId: string, suffix = '') {
    const commands = suffix ? ['/inventario', inventoryId, suffix] : ['/inventario', inventoryId];
    void this.router.navigate(commands);
  }
}
