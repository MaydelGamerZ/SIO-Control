import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-error-state',
  standalone: false,
  templateUrl: './error-state.html',
  styleUrl: './error-state.scss',
})
export class ErrorState {
  readonly message = input('');
  readonly visible = computed(() => Boolean(this.message()));
}
