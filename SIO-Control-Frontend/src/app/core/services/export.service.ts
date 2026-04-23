// @ts-nocheck
import { Injectable } from '@angular/core';
import { exportInventoryToPdf } from '../lib/data/inventory-pdf-export';
import {
  exportInventoriesSummaryToExcel,
  exportInventoryDifferencesToExcel,
  exportInventoryToExcel,
  exportUserPerformanceToExcel,
} from '../lib/data/inventory-spreadsheet-export';

@Injectable({
  providedIn: 'root',
})
export class ExportService {
  exportInventoryToPdf(inventory: any) {
    return exportInventoryToPdf(inventory);
  }

  exportInventoryToExcel(inventory: any) {
    return exportInventoryToExcel(inventory);
  }

  exportInventoryDifferencesToExcel(inventory: any) {
    return exportInventoryDifferencesToExcel(inventory);
  }

  exportInventoriesSummaryToExcel(inventories: any[] = []) {
    return exportInventoriesSummaryToExcel(inventories);
  }

  exportUserPerformanceToExcel(performance: any[] = []) {
    return exportUserPerformanceToExcel(performance);
  }
}
