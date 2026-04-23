import { Injectable } from '@angular/core';
import { flattenProducts, getProductRisk } from '../lib/domain/inventory-core';

@Injectable({
  providedIn: 'root',
})
export class CompareService {
  readonly filters = [
    { id: 'all', label: 'Ver todos' },
    { id: 'match', label: 'Coinciden' },
    { id: 'different', label: 'Diferentes' },
    { id: 'pending', label: 'Pendientes' },
    { id: 'validated', label: 'Validados' },
    { id: 'observations', label: 'Con observaciones' },
    { id: 'critical', label: 'Criticos' },
  ];

  buildRows(inventory: any, countAId: string, countBId: string) {
    const countA = inventory?.userCounts?.find((count: any) => count.id === countAId);
    const countB = inventory?.userCounts?.find((count: any) => count.id === countBId);

    if (!inventory || !countA || !countB) {
      return [];
    }

    const productsB = new Map<string, any>();
    for (const row of flattenProducts(countB.categories || [])) {
      productsB.set(`${row.categoryId}:${row.product.id}`, row.product);
    }

    return flattenProducts(countA.categories || []).map((row: any) => {
      const productB = productsB.get(`${row.categoryId}:${row.product.id}`);
      const totalA = Number(row.product.totalCounted || 0);
      const totalB = Number(productB?.totalCounted || 0);
      const productKey = `${row.categoryId}:${row.product.id}`;
      const observed = this.hasObservations(row.product) || this.hasObservations(productB);
      const missingInfo = !row.product.countEntries?.length || !productB?.countEntries?.length;
      const risk = getProductRisk({ ...row.product, difference: totalA - totalB });

      return {
        categoryId: row.categoryId,
        categoryName: row.categoryName,
        critical: risk.critical,
        difference: totalA - totalB,
        missingInfo,
        observed,
        product: row.product,
        productB,
        productId: row.product.id,
        productKey,
        risk,
        totalA,
        totalB,
        verified: Boolean(inventory?.verifiedProducts?.[productKey]),
      };
    });
  }

  hasObservations(product: any) {
    return (product?.countEntries || []).some(
      (entry: any) => (entry.observation && entry.observation !== 'Buen estado') || String(entry.comment || '').trim(),
    );
  }
}
