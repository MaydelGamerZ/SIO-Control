import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { AnalyticsService } from '../../../../core/services/analytics.service';
import { InventoryService } from '../../../../core/services/inventory.service';
import { RealtimeService } from '../../../../core/services/realtime.service';
import { formatDisplayDate, formatTime } from '../../../../core/lib/domain/inventory-core';

@Component({
  selector: 'app-audit-log-page',
  standalone: false,
  templateUrl: './audit-log-page.html',
  styleUrl: './audit-log-page.scss',
})
export class AuditLogPage implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly subscriptions = new Subscription();

  readonly auth = inject(AuthService);
  readonly analytics = inject(AnalyticsService);
  readonly inventoryService = inject(InventoryService);
  readonly realtime = inject(RealtimeService);

  readonly logs = signal<any[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly actionFilter = signal('all');
  readonly dateFilter = signal('');
  readonly search = signal('');
  readonly userFilter = signal('');
  readonly formatDisplayDate = formatDisplayDate;
  readonly formatTime = formatTime;

  ngOnInit() {
    this.subscriptions.add(
      this.inventoryService.auditLogs$(this.auth.user()).subscribe({
        next: (logs) => {
          this.logs.set(logs);
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

  get actions() {
    return Array.from(new Set(this.logs().map((log) => log.action).filter(Boolean))).sort();
  }

  get filteredLogs() {
    const text = this.search().trim().toLowerCase();
    return this.logs().filter((log) => {
      const logDate = String(log.createdAtLocal || '').slice(0, 10);
      const haystack = `${log.action} ${log.userName} ${log.userEmail} ${log.cedis} ${log.inventoryStatus} ${JSON.stringify(log.details || {})}`.toLowerCase();
      const matchesText = !text || haystack.includes(text);
      const matchesUser = !this.userFilter() || `${log.userName} ${log.userEmail}`.toLowerCase().includes(this.userFilter().toLowerCase());
      const matchesDate = !this.dateFilter() || logDate === this.dateFilter();
      const matchesAction = this.actionFilter() === 'all' || log.action === this.actionFilter();
      return matchesText && matchesUser && matchesDate && matchesAction;
    });
  }

  describeDetails(details: any = {}) {
    if (details.productName) return `${details.productName} - ${details.categoryName || ''}`;
    if (details.status) return `Estado: ${details.status}`;
    if (details.restoredVersionLabel) return `Restaurada: ${details.restoredVersionLabel}`;
    if (details.sourcePdfName) return details.sourcePdfName;
    return JSON.stringify(details || {});
  }

  formatLogDate(log: any) {
    return formatDisplayDate(String(log.createdAtLocal || '').slice(0, 10));
  }

  actionTone(log: any) {
    return String(log.action || '').includes('eliminar') ? 'text-bg-danger' : 'text-bg-primary';
  }

  openInventory(inventoryId: string) {
    void this.router.navigate(['/inventario', inventoryId]);
  }
}
