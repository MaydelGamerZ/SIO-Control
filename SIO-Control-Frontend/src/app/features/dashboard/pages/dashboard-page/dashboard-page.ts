import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { AnalyticsService } from '../../../../core/services/analytics.service';
import { InventoryService } from '../../../../core/services/inventory.service';
import { RealtimeService } from '../../../../core/services/realtime.service';
import { UserService } from '../../../../core/services/user.service';
import { formatDisplayDate, formatNumber, formatTime } from '../../../../core/lib/domain/inventory-core';

@Component({
  selector: 'app-dashboard-page',
  standalone: false,
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.scss',
})
export class DashboardPage implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly subscriptions = new Subscription();

  readonly auth = inject(AuthService);
  readonly analytics = inject(AnalyticsService);
  readonly inventoryService = inject(InventoryService);
  readonly realtime = inject(RealtimeService);
  readonly userService = inject(UserService);

  readonly inventories = signal<any[]>([]);
  readonly logs = signal<any[]>([]);
  readonly users = signal<any[]>([]);
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

    if (this.auth.canAudit()) {
      this.subscriptions.add(this.inventoryService.auditLogs$(this.auth.user()).subscribe((logs) => this.logs.set(logs)));
      this.subscriptions.add(this.userService.users$(this.auth.user()).subscribe((users) => this.users.set(users)));
    }
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  get metrics() {
    return this.analytics.buildDashboardMetrics(this.inventories(), this.users());
  }

  get activity() {
    return this.analytics.buildRecentActivity(this.inventories(), this.logs());
  }

  get alerts() {
    return this.analytics.buildInventoryAlerts(this.inventories(), this.users());
  }

  get activeInventories() {
    return this.inventories().filter((inventory) => !['cerrado', 'validado'].includes(inventory.status)).slice(0, 8);
  }

  get countedByCurrentUser() {
    return this.inventories().filter((inventory) =>
      inventory.participants?.some((participant: any) => participant.userId === this.auth.user()?.uid),
    ).length;
  }

  get finalizedInventories() {
    return this.inventories().filter((inventory) => ['validado', 'cerrado'].includes(inventory.status)).length;
  }

  openInventory(inventoryId: string) {
    void this.router.navigate(['/inventario', inventoryId]);
  }

  openAlert(alert: any) {
    if (!alert?.inventoryId) {
      return;
    }

    this.openInventory(alert.inventoryId);
  }
}
