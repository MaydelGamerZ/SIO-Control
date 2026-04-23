import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  addCountEntry,
  addUserCountEntry,
  createInventoryFromParsed,
  deleteCountEntry,
  deleteUserCountEntry,
  generateFinalCount,
  getInventory,
  getInventoryForUser,
  listInventories,
  restoreInventoryVersion,
  setUserProductTotal,
  setComparisonProductVerification,
  subscribeAuditLogs,
  subscribeCurrentInventory,
  subscribeCurrentInventoryForUser,
  subscribeInventories,
  subscribeInventory,
  subscribeInventoryForUser,
  subscribeTodayInventory,
  updateCountEntry,
  updateInventoryStatus,
  updateUserCountEntry,
} from '../lib/data/inventory.repository';
import { parseInventoryPdf } from '../lib/data/pdf-inventory-parser';

@Injectable({
  providedIn: 'root',
})
export class InventoryService {
  inventories$() {
    return new Observable<any[]>((subscriber) =>
      subscribeInventories(
        (inventories: any[]) => subscriber.next(inventories),
        (error: any) => subscriber.error(error),
      ),
    );
  }

  todayInventory$(dateKey?: string) {
    return new Observable<any | null>((subscriber) =>
      subscribeTodayInventory(
        dateKey,
        (inventory: any) => subscriber.next(inventory),
        (error: any) => subscriber.error(error),
      ),
    );
  }

  inventory$(inventoryId: string) {
    return new Observable<any | null>((subscriber) =>
      subscribeInventory(
        inventoryId,
        (inventory: any) => subscriber.next(inventory),
        (error: any) => subscriber.error(error),
      ),
    );
  }

  inventoryForUser$(inventoryId: string, user: any) {
    return new Observable<any | null>((subscriber) =>
      subscribeInventoryForUser(
        inventoryId,
        user,
        (inventory: any) => subscriber.next(inventory),
        (error: any) => subscriber.error(error),
      ),
    );
  }

  currentInventory$(inventoryId = '') {
    return new Observable<any | null>((subscriber) =>
      subscribeCurrentInventory(
        inventoryId,
        (inventory: any) => subscriber.next(inventory),
        (error: any) => subscriber.error(error),
      ),
    );
  }

  currentInventoryForUser$(inventoryId: string, user: any) {
    return new Observable<any | null>((subscriber) =>
      subscribeCurrentInventoryForUser(
        inventoryId,
        user,
        (inventory: any) => subscriber.next(inventory),
        (error: any) => subscriber.error(error),
      ),
    );
  }

  auditLogs$(user: any) {
    return new Observable<any[]>((subscriber) =>
      subscribeAuditLogs(
        user,
        (logs: any[]) => subscriber.next(logs),
        (error: any) => subscriber.error(error),
      ),
    );
  }

  async listInventories() {
    return listInventories();
  }

  async getInventory(inventoryId: string) {
    return getInventory(inventoryId);
  }

  async getInventoryForUser(inventoryId: string, user: any) {
    return getInventoryForUser(inventoryId, user);
  }

  async parseInventoryPdf(file: File) {
    return parseInventoryPdf(file);
  }

  async createInventoryFromParsed(parsedInventory: any, user: any) {
    return createInventoryFromParsed(parsedInventory, user);
  }

  async addCountEntry(inventoryId: string, categoryId: string, productId: string, entry: any, user: any) {
    return addCountEntry(inventoryId, categoryId, productId, entry, user);
  }

  async updateCountEntry(inventoryId: string, categoryId: string, productId: string, entryId: string, entryPatch: any, user: any) {
    return updateCountEntry(inventoryId, categoryId, productId, entryId, entryPatch, user);
  }

  async deleteCountEntry(inventoryId: string, categoryId: string, productId: string, entryId: string, user: any) {
    return deleteCountEntry(inventoryId, categoryId, productId, entryId, user);
  }

  async updateInventoryStatus(inventoryId: string, status: string, user: any) {
    return updateInventoryStatus(inventoryId, status, user);
  }

  async addUserCountEntry(inventoryId: string, userCountId: string, categoryId: string, productId: string, entry: any, user: any) {
    return addUserCountEntry(inventoryId, userCountId, categoryId, productId, entry, user);
  }

  async updateUserCountEntry(inventoryId: string, userCountId: string, categoryId: string, productId: string, entryId: string, entryPatch: any, user: any) {
    return updateUserCountEntry(inventoryId, userCountId, categoryId, productId, entryId, entryPatch, user);
  }

  async deleteUserCountEntry(inventoryId: string, userCountId: string, categoryId: string, productId: string, entryId: string, user: any) {
    return deleteUserCountEntry(inventoryId, userCountId, categoryId, productId, entryId, user);
  }

  async setComparisonProductVerification(inventoryId: string, productKey: string, verified: boolean, user: any) {
    return setComparisonProductVerification(inventoryId, productKey, verified, user);
  }

  async setUserProductTotal(inventoryId: string, userCountId: string, categoryId: string, productId: string, quantity: number, user: any) {
    return setUserProductTotal(inventoryId, userCountId, categoryId, productId, quantity, user);
  }

  async generateFinalCount(inventoryId: string, user: any, countAId: string, countBId: string) {
    return generateFinalCount(inventoryId, user, countAId, countBId);
  }

  async restoreInventoryVersion(inventoryId: string, versionId: string, user: any) {
    return restoreInventoryVersion(inventoryId, versionId, user);
  }
}
