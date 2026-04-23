import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-realtime-indicator',
  standalone: false,
  templateUrl: './realtime-indicator.html',
  styleUrl: './realtime-indicator.scss',
})
export class RealtimeIndicator {
  readonly status = input<'connecting' | 'offline' | 'synced'>('connecting');

  readonly toneClass = computed(() => {
    switch (this.status()) {
      case 'offline':
        return 'text-bg-warning';
      case 'synced':
        return 'text-bg-success';
      default:
        return 'text-bg-secondary';
    }
  });

  readonly label = computed(() => {
    switch (this.status()) {
      case 'offline':
        return 'Offline';
      case 'synced':
        return 'Tiempo real';
      default:
        return 'Conectando';
    }
  });
}
