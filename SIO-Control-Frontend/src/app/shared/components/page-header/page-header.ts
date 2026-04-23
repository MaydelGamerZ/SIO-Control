import { Component, input } from '@angular/core';

@Component({
  selector: 'app-page-header',
  standalone: false,
  templateUrl: './page-header.html',
  styleUrl: './page-header.scss',
})
export class PageHeader {
  readonly eyebrow = input('');
  readonly title = input('');
  readonly description = input('');
}
