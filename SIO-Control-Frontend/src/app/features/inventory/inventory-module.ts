import { NgModule } from '@angular/core';
import { InventoryRoutingModule } from './inventory-routing-module';
import { SummaryPage } from './pages/summary-page/summary-page';
import { UploadPage } from './pages/upload-page/upload-page';
import { CountPage } from './pages/count-page/count-page';
import { ComparisonPage } from './pages/comparison-page/comparison-page';
import { HistoryPage } from './pages/history-page/history-page';
import { InventoryDetailPage } from './pages/inventory-detail-page/inventory-detail-page';
import { InventoryVersionsPage } from './pages/inventory-versions-page/inventory-versions-page';
import { SharedModule } from '../../shared/shared-module';

@NgModule({
  declarations: [
    SummaryPage,
    UploadPage,
    CountPage,
    ComparisonPage,
    HistoryPage,
    InventoryDetailPage,
    InventoryVersionsPage,
  ],
  imports: [SharedModule, InventoryRoutingModule],
})
export class InventoryModule {}
