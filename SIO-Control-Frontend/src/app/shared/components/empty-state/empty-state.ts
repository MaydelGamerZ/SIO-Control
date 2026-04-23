import { Component, input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  standalone: false,
  templateUrl: './empty-state.html',
  styleUrl: './empty-state.scss',
})
export class EmptyState {
  readonly title = input('Sin datos');
  readonly description = input('No hay informacion disponible para esta vista.');
  readonly icon = input('bi-inbox');
}
