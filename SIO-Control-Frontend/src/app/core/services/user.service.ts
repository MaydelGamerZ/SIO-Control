import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  assertCanAudit,
  assertCanCount,
  canAuditUser,
  canCountUser,
  getRoleLabel,
  listUsers,
  normalizeRole,
  subscribeUserProfile,
  subscribeUsers,
  updateUserActive,
  updateUserRole,
  upsertUserProfile,
  userRoles,
} from '../lib/data/user.repository';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  readonly roles = userRoles;

  getRoleLabel(roleOrProfile: any) {
    return getRoleLabel(roleOrProfile);
  }

  normalizeRole(role: string) {
    return normalizeRole(role);
  }

  canAudit(user: any, profile: any) {
    return canAuditUser(user, profile);
  }

  canCount(user: any, profile: any) {
    return canCountUser(user, profile);
  }

  async upsertProfile(user: any) {
    return upsertUserProfile(user);
  }

  async listUsers(actor: any) {
    return listUsers(actor);
  }

  users$(actor: any) {
    return new Observable<any[]>((subscriber) =>
      subscribeUsers(
        actor,
        (users: any[]) => subscriber.next(users),
        (error: any) => subscriber.error(error),
      ),
    );
  }

  profile$(uid: string) {
    return new Observable<any | null>((subscriber) =>
      subscribeUserProfile(
        uid,
        (profile: any) => subscriber.next(profile),
        (error: any) => subscriber.error(error),
      ),
    );
  }

  async updateRole(uid: string, role: string, actor: any) {
    return updateUserRole(uid, role, actor);
  }

  async updateActive(uid: string, active: boolean, actor: any) {
    return updateUserActive(uid, active, actor);
  }

  async assertCanAudit(user: any, action = 'realizar esta accion') {
    return assertCanAudit(user, action);
  }

  async assertCanCount(user: any, action = 'realizar conteos') {
    return assertCanCount(user, action);
  }
}
