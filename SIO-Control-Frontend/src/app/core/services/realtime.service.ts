import { Injectable, computed, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class RealtimeService {
  readonly online = signal(typeof navigator === 'undefined' ? true : navigator.onLine);
  readonly status = computed<'connecting' | 'offline' | 'synced'>(() => (this.online() ? 'synced' : 'offline'));

  constructor() {
    if (typeof window === 'undefined') {
      return;
    }

    window.addEventListener('online', () => this.online.set(true));
    window.addEventListener('offline', () => this.online.set(false));
  }
}
