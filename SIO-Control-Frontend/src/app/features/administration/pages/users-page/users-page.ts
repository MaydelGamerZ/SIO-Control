import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { UserService } from '../../../../core/services/user.service';
import { formatTime } from '../../../../core/lib/domain/inventory-core';

@Component({
  selector: 'app-users-page',
  standalone: false,
  templateUrl: './users-page.html',
  styleUrl: './users-page.scss',
})
export class UsersPage implements OnInit, OnDestroy {
  private readonly subscriptions = new Subscription();

  readonly auth = inject(AuthService);
  readonly userService = inject(UserService);
  readonly users = signal<any[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly roleFilter = signal('all');
  readonly search = signal('');
  readonly sortBy = signal('email');
  readonly formatTime = formatTime;

  ngOnInit() {
    this.subscriptions.add(
      this.userService.users$(this.auth.user()).subscribe({
        next: (users) => {
          this.users.set(users);
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

  get filteredUsers() {
    return this.users()
      .filter((systemUser) => {
        const haystack = `${systemUser.displayName || ''} ${systemUser.email || ''}`.toLowerCase();
        const matchesText = !this.search() || haystack.includes(this.search().toLowerCase());
        const matchesRole = this.roleFilter() === 'all' || (systemUser.role || this.userService.roles.counter) === this.roleFilter();
        return matchesText && matchesRole;
      })
      .sort((a, b) => {
        if (this.sortBy() === 'name') {
          return (a.displayName || a.email || '').localeCompare(b.displayName || b.email || '');
        }
        if (this.sortBy() === 'lastSeenAt') {
          return String(b.lastSeenAt?.seconds || '').localeCompare(String(a.lastSeenAt?.seconds || ''));
        }
        return (a.email || '').localeCompare(b.email || '');
      });
  }

  async changeRole(uid: string, role: string) {
    try {
      await this.userService.updateRole(uid, role, this.auth.user());
    } catch (error: any) {
      this.error.set(error.message);
    }
  }

  async toggleActive(uid: string, active: boolean) {
    try {
      await this.userService.updateActive(uid, active, this.auth.user());
    } catch (error: any) {
      this.error.set(error.message);
    }
  }
}
