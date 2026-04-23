import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';
import { ComparisonPage } from './pages/comparison-page/comparison-page';
import { CountPage } from './pages/count-page/count-page';
import { HistoryPage } from './pages/history-page/history-page';
import { InventoryDetailPage } from './pages/inventory-detail-page/inventory-detail-page';
import { InventoryVersionsPage } from './pages/inventory-versions-page/inventory-versions-page';
import { SummaryPage } from './pages/summary-page/summary-page';
import { UploadPage } from './pages/upload-page/upload-page';

const routes: Routes = [
  { path: 'inventario/resumen', component: SummaryPage },
  { path: 'inventario/conteo', component: CountPage },
  { path: 'inventario/historial', component: HistoryPage },
  { path: 'inventario/cargar', component: UploadPage, canActivate: [roleGuard] },
  { path: 'inventario/comparar', component: ComparisonPage, canActivate: [roleGuard] },
  { path: 'inventario/:id', component: InventoryDetailPage },
  { path: 'inventario/:id/editar', component: CountPage },
  { path: 'inventario/:id/comparar', component: ComparisonPage, canActivate: [roleGuard] },
  { path: 'inventario/:id/versiones', component: InventoryVersionsPage, canActivate: [roleGuard] },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class InventoryRoutingModule {}
