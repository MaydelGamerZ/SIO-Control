import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { CompareService } from '../../../../core/services/compare.service';
import { InventoryService } from '../../../../core/services/inventory.service';
import { RealtimeService } from '../../../../core/services/realtime.service';
import { formatDisplayDate, formatNumber, isInventoryReadOnly } from '../../../../core/lib/domain/inventory-core';

@Component({
  selector: 'app-comparison-page',
  standalone: false,
  templateUrl: './comparison-page.html',
  styleUrl: './comparison-page.scss',
})
export class ComparisonPage implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly subscriptions = new Subscription();

  readonly auth = inject(AuthService);
  readonly compareService = inject(CompareService);
  readonly inventoryService = inject(InventoryService);
  readonly realtime = inject(RealtimeService);

  readonly inventory = signal<any | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly countAId = signal('');
  readonly countBId = signal('');
  readonly filterId = signal('all');
  readonly categoryFilterId = signal('all');
  readonly search = signal('');
  readonly smartMode = signal(false);
  readonly saving = signal(false);
  readonly adjustments: Record<string, { a: number; b: number }> = {};

  readonly formatDisplayDate = formatDisplayDate;
  readonly formatNumber = formatNumber;

  ngOnInit() {
    const inventoryId = this.route.snapshot.paramMap.get('id') || '';
    this.subscriptions.add(
      this.inventoryService.currentInventory$(inventoryId).subscribe({
        next: (inventory) => {
          this.inventory.set(inventory);
          this.loading.set(false);
          this.error.set('');

          if (inventory?.userCounts?.length) {
            if (!inventory.userCounts.some((count: any) => count.id === this.countAId())) {
              this.countAId.set(inventory.userCounts[0]?.id || '');
            }
            if (!inventory.userCounts.some((count: any) => count.id === this.countBId())) {
              this.countBId.set(inventory.userCounts[1]?.id || '');
            }
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

  get readOnly() {
    return isInventoryReadOnly(this.inventory()?.status);
  }

  get countA() {
    return this.inventory()?.userCounts?.find((count: any) => count.id === this.countAId());
  }

  get countB() {
    return this.inventory()?.userCounts?.find((count: any) => count.id === this.countBId());
  }

  get comparisonRows() {
    return this.compareService.buildRows(this.inventory(), this.countAId(), this.countBId());
  }

  get filteredRows() {
    const searchText = this.search().trim().toLowerCase();
    return this.comparisonRows.filter((row: any) => {
      const matchesSearch = !searchText || `${row.product.name} ${row.categoryName}`.toLowerCase().includes(searchText);
      if (!matchesSearch) return false;
      if (this.categoryFilterId() !== 'all' && row.categoryId !== this.categoryFilterId()) return false;
      if (this.smartMode() && !row.critical && row.difference === 0 && !row.missingInfo) return false;
      if (this.filterId() === 'match') return row.difference === 0 && !row.missingInfo;
      if (this.filterId() === 'different') return row.difference !== 0;
      if (this.filterId() === 'pending') return row.missingInfo;
      if (this.filterId() === 'validated') return row.verified;
      if (this.filterId() === 'observations') return row.observed;
      if (this.filterId() === 'critical') return row.critical;
      return true;
    });
  }

  get matchingRows() {
    return this.comparisonRows.filter((row: any) => row.difference === 0 && !row.missingInfo).length;
  }

  get differentRows() {
    return this.comparisonRows.filter((row: any) => row.difference !== 0).length;
  }

  get pendingRows() {
    return this.comparisonRows.filter((row: any) => row.missingInfo).length;
  }

  get criticalRows() {
    return this.comparisonRows.filter((row: any) => row.critical).length;
  }

  get categories() {
    return this.countA?.categories || [];
  }

  adjustmentFor(row: any) {
    if (!this.adjustments[row.productKey]) {
      this.adjustments[row.productKey] = {
        a: Number(row.totalA || 0),
        b: Number(row.totalB || 0),
      };
    }
    return this.adjustments[row.productKey];
  }

  async applyAdjustment(row: any, side: 'a' | 'b') {
    if (!this.inventory()) {
      return;
    }

    const quantity = Number(this.adjustmentFor(row)[side] || 0);
    const userCountId = side === 'a' ? this.countAId() : this.countBId();

    this.saving.set(true);
    try {
      await this.inventoryService.setUserProductTotal(this.inventory().id, userCountId, row.categoryId, row.productId, quantity, this.auth.user());
      this.error.set('');
    } catch (error: any) {
      this.error.set(error.message);
    } finally {
      this.saving.set(false);
    }
  }

  async toggleValidation(row: any) {
    this.saving.set(true);
    try {
      await this.inventoryService.setComparisonProductVerification(this.inventory().id, row.productKey, !row.verified, this.auth.user());
      this.error.set('');
    } catch (error: any) {
      this.error.set(error.message);
    } finally {
      this.saving.set(false);
    }
  }

  async createFinalCount() {
    this.saving.set(true);
    try {
      await this.inventoryService.generateFinalCount(this.inventory().id, this.auth.user(), this.countAId(), this.countBId());
      this.error.set('');
    } catch (error: any) {
      this.error.set(error.message);
    } finally {
      this.saving.set(false);
    }
  }
}
