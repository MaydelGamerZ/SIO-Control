import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { InventoryService } from '../../../../core/services/inventory.service';
import { formatDisplayDate, formatNumber } from '../../../../core/lib/domain/inventory-core';

@Component({
  selector: 'app-upload-page',
  standalone: false,
  templateUrl: './upload-page.html',
  styleUrl: './upload-page.scss',
})
export class UploadPage {
  private readonly router = inject(Router);

  readonly auth = inject(AuthService);
  readonly inventoryService = inject(InventoryService);
  readonly error = signal('');
  readonly loading = signal(false);
  readonly parsedInventory = signal<any | null>(null);
  readonly selectedFileName = signal('');
  readonly formatDisplayDate = formatDisplayDate;
  readonly formatNumber = formatNumber;

  get previewStats() {
    const parsedInventory = this.parsedInventory();
    return [
      { label: 'Semana', value: parsedInventory?.semana || 'Sin semana' },
      { label: 'Fecha', value: formatDisplayDate(parsedInventory?.dateKey) },
      { label: 'CEDIS', value: parsedInventory?.cedis },
      { label: 'Total general PDF', value: formatNumber(parsedInventory?.totalGeneralPdf) },
      { label: 'Categorias', value: formatNumber(parsedInventory?.categories?.length || 0) },
      {
        label: 'Productos',
        value: formatNumber(parsedInventory?.categories?.reduce((total: number, category: any) => total + category.products.length, 0) || 0),
      },
    ];
  }

  async parseFile(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    this.loading.set(true);
    this.error.set('');
    this.selectedFileName.set(file.name);

    try {
      this.parsedInventory.set(await this.inventoryService.parseInventoryPdf(file));
    } catch (error: any) {
      this.parsedInventory.set(null);
      this.error.set(error.message);
    } finally {
      this.loading.set(false);
    }
  }

  async confirmInventory() {
    if (!this.parsedInventory()) {
      return;
    }

    this.loading.set(true);
    this.error.set('');

    try {
      const inventoryId = await this.inventoryService.createInventoryFromParsed(this.parsedInventory(), this.auth.user());
      await this.router.navigate(['/inventario', inventoryId, 'editar']);
    } catch (error: any) {
      this.error.set(error.message);
    } finally {
      this.loading.set(false);
    }
  }

  reset() {
    this.error.set('');
    this.selectedFileName.set('');
    this.parsedInventory.set(null);
  }
}
