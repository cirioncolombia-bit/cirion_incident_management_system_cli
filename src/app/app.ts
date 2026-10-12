import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LoadingProgress } from './shared/loading/loading-progress';

@Component({
  imports: [RouterOutlet, LoadingProgress],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  protected readonly title = signal('cims');
}
