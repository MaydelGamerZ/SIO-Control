import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { LoadingState } from './components/loading-state/loading-state';
import { ErrorState } from './components/error-state/error-state';
import { EmptyState } from './components/empty-state/empty-state';
import { RealtimeIndicator } from './components/realtime-indicator/realtime-indicator';
import { StatCard } from './components/stat-card/stat-card';
import { PageHeader } from './components/page-header/page-header';

@NgModule({
  declarations: [LoadingState, ErrorState, EmptyState, RealtimeIndicator, StatCard, PageHeader],
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  exports: [
    CommonModule,
    ErrorState,
    EmptyState,
    FormsModule,
    LoadingState,
    PageHeader,
    ReactiveFormsModule,
    RealtimeIndicator,
    RouterModule,
    StatCard,
  ],
})
export class SharedModule {}
