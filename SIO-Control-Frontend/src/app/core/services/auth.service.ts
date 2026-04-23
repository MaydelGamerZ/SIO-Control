import { Injectable, computed, signal } from '@angular/core';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import { auth, googleProvider } from '../lib/data/firebase';
import { canAuditUser, getRoleLabel, subscribeUserProfile, upsertUserProfile } from '../lib/data/user.repository';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private profileUnsubscribe: VoidFunction = () => {};
  private initialized = false;
  private resolveReady: (() => void) | null = null;
  private readonly readyPromise = new Promise<void>((resolve) => {
    this.resolveReady = resolve;
  });

  readonly user = signal<User | null>(null);
  readonly loading = signal(true);
  readonly profile = signal<any | null>(null);
  readonly profileLoading = signal(true);
  readonly profileError = signal('');
  readonly canAudit = computed(() => canAuditUser(this.user(), this.profile()));
  readonly roleLabel = computed(() => getRoleLabel(this.profile()));

  constructor() {
    onAuthStateChanged(auth, (currentUser) => {
      this.user.set(currentUser);
      this.loading.set(false);

      if (!currentUser) {
        this.profileUnsubscribe();
        this.profile.set(null);
        this.profileError.set('');
        this.profileLoading.set(false);
        this.markReady();
        return;
      }

      this.profileLoading.set(true);
      upsertUserProfile(currentUser).catch((error) => {
        this.profileError.set(error.message);
        this.profileLoading.set(false);
      });

      this.profileUnsubscribe();
      this.profileUnsubscribe = subscribeUserProfile(
        currentUser.uid,
        (currentProfile: any) => {
          this.profile.set(currentProfile);
          this.profileError.set('');
          this.profileLoading.set(false);
          this.markReady();
        },
        (error: any) => {
          this.profileError.set(error.message);
          this.profileLoading.set(false);
          this.markReady();
        },
      );
    });
  }

  async waitUntilReady() {
    await this.readyPromise;
  }

  async loginWithEmail(email: string, password: string) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  async registerWithEmail(email: string, password: string) {
    return createUserWithEmailAndPassword(auth, email, password);
  }

  async loginWithGoogle() {
    return signInWithPopup(auth, googleProvider);
  }

  async logout() {
    return signOut(auth);
  }

  private markReady() {
    if (this.initialized) {
      return;
    }
    this.initialized = true;
    this.resolveReady?.();
  }
}
