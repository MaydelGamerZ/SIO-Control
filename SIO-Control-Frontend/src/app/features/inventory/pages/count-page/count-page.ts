import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { InventoryService } from '../../../../core/services/inventory.service';
import { RealtimeService } from '../../../../core/services/realtime.service';
import {
  filterProductRows,
  formatNumber,
  formatTime,
  getCategoryProgress,
  getProductStatus,
  inventoryStatuses,
  isInventoryReadOnly,
  observationOptions,
  productFilters,
} from '../../../../core/lib/domain/inventory-core';

@Component({
  selector: 'app-count-page',
  standalone: false,
  templateUrl: './count-page.html',
  styleUrl: './count-page.scss',
})
export class CountPage implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly subscriptions = new Subscription();

  readonly auth = inject(AuthService);
  readonly inventoryService = inject(InventoryService);
  readonly realtime = inject(RealtimeService);

  readonly inventory = signal<any | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly activeCategoryId = signal('');
  readonly filterId = signal('global');
  readonly search = signal('');

  readonly productFilters = productFilters;
  readonly observationOptions = observationOptions;
  readonly formatNumber = formatNumber;
  readonly formatTime = formatTime;
  readonly getCategoryProgress = getCategoryProgress;
  readonly getProductStatus = getProductStatus;
  readonly inventoryStatuses = inventoryStatuses;

  readonly drafts: Record<string, any> = {};
  readonly entryDrafts: Record<string, any> = {};

  ngOnInit() {
    const inventoryId = this.route.snapshot.paramMap.get('id') || '';
    this.subscriptions.add(
      this.inventoryService.currentInventoryForUser$(inventoryId, this.auth.user()).subscribe({
        next: (inventory) => {
          this.inventory.set(inventory);
          this.loading.set(false);
          this.error.set('');

          if (inventory?.categories?.length && !inventory.categories.some((category: any) => category.id === this.activeCategoryId())) {
            this.activeCategoryId.set(inventory.categories[0].id);
          }
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

  get categories() {
    return this.inventory()?.categories || [];
  }

  get activeCategory() {
    return this.categories.find((category: any) => category.id === this.activeCategoryId()) || this.categories[0];
  }

  get visibleRows() {
    if (!this.inventory()) {
      return [];
    }

    return filterProductRows({
      categories: this.categories,
      categoryId: this.activeCategory?.id || '',
      filterId: this.filterId(),
      search: this.search(),
    });
  }

  get readOnly() {
    return isInventoryReadOnly(this.inventory()?.status);
  }

  draftFor(productId: string) {
    if (!this.drafts[productId]) {
      this.drafts[productId] = {
        comment: '',
        observation: 'Buen estado',
        quantity: 0,
      };
    }
    return this.drafts[productId];
  }

  entryDraftFor(entry: any) {
    if (!this.entryDrafts[entry.id]) {
      this.entryDrafts[entry.id] = {
        comment: entry.comment || '',
        observation: entry.observation || entry.condition || 'Buen estado',
        quantity: Number(entry.quantity || 0),
      };
    }
    return this.entryDrafts[entry.id];
  }

  async addEntry(row: any) {
    const draft = this.draftFor(row.product.id);
    if (Number(draft.quantity || 0) <= 0) {
      this.error.set('La cantidad debe ser mayor a cero.');
      return;
    }

    try {
      await this.inventoryService.addCountEntry(this.inventory().id, row.categoryId, row.product.id, draft, this.auth.user());
      this.drafts[row.product.id] = { quantity: 0, observation: 'Buen estado', comment: '' };
      this.error.set('');
    } catch (error: any) {
      this.error.set(error.message);
    }
  }

  async updateEntry(row: any, entry: any) {
    try {
      await this.inventoryService.updateCountEntry(
        this.inventory().id,
        row.categoryId,
        row.product.id,
        entry.id,
        this.entryDraftFor(entry),
        this.auth.user(),
      );
      this.error.set('');
    } catch (error: any) {
      this.error.set(error.message);
    }
  }

  async deleteEntry(row: any, entryId: string) {
    try {
      await this.inventoryService.deleteCountEntry(this.inventory().id, row.categoryId, row.product.id, entryId, this.auth.user());
      this.error.set('');
    } catch (error: any) {
      this.error.set(error.message);
    }
  }

  async save(status: string) {
    if (!this.inventory()) {
      return;
    }

    try {
      await this.inventoryService.updateInventoryStatus(this.inventory().id, status, this.auth.user());
      this.error.set('');
      if (status === inventoryStatuses.saved) {
        await this.router.navigate(['/inventario/resumen']);
      }
    } catch (error: any) {
      this.error.set(error.message);
    }
  }
}
