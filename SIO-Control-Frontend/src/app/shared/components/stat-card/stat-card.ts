import { Component, input } from '@angular/core';

@Component({
  selector: 'app-stat-card',
  standalone: false,
  templateUrl: './stat-card.html',
  styleUrl: './stat-card.scss',
})
export class StatCard {
  readonly label = input('');
  readonly value = input('');
  readonly tone = input<'danger' | 'primary' | 'secondary' | 'success' | 'warning'>('primary');
  readonly icon = input('bi-bar-chart');
}
