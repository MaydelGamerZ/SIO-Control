import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { InventoryService } from '../../../../core/services/inventory.service';
import { RealtimeService } from '../../../../core/services/realtime.service';
import { formatDisplayDate, formatNumber, formatTime, isInventoryReadOnly } from '../../../../core/lib/domain/inventory-core';

@Component({
  selector: 'app-inventory-versions-page',
  standalone: false,
  templateUrl: './inventory-versions-page.html',
  styleUrl: './inventory-versions-page.scss',
})
export class InventoryVersionsPage implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly subscriptions = new Subscription();

  readonly auth = inject(AuthService);
  readonly inventoryService = inject(InventoryService);
  readonly realtime = inject(RealtimeService);

  readonly inventory = signal<any | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly selectedA = signal('');
  readonly selectedB = signal('');
  readonly formatDisplayDate = formatDisplayDate;
  readonly formatNumber = formatNumber;
  readonly formatTime = formatTime;

  ngOnInit() {
    const inventoryId = this.route.snapshot.paramMap.get('id') || '';

    this.subscriptions.add(
      this.inventoryService.inventory$(inventoryId).subscribe({
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

  get versions() {
    return this.inventory()?.versions || [];
  }

  get comparison() {
    const first = this.versions.find((version: any) => version.id === this.selectedA());
    const second = this.versions.find((version: any) => version.id === this.selectedB());

    if (!first || !second) {
      return null;
    }

    return {
      differenceDelta: Number(second.difference || 0) - Number(first.difference || 0),
      progressDelta: Number(second.progress || 0) - Number(first.progress || 0),
      totalDelta: Number(second.totalCounted || 0) - Number(first.totalCounted || 0),
    };
  }

  async restore(versionId: string) {
    if (!this.inventory()) {
      return;
    }

    try {
      await this.inventoryService.restoreInventoryVersion(this.inventory().id, versionId, this.auth.user());
    } catch (error: any) {
      this.error.set(error.message);
    }
  }

  get readOnly() {
    return isInventoryReadOnly(this.inventory()?.status);
  }
}
