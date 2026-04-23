import { Component, input } from '@angular/core';

@Component({
  selector: 'app-loading-state',
  standalone: false,
  templateUrl: './loading-state.html',
  styleUrl: './loading-state.scss',
})
export class LoadingState {
  readonly label = input('Cargando datos');
}
