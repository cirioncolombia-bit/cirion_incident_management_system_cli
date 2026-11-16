import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
@Component({
  selector: 'app-indicators-nav',
  imports: [RouterLink, RouterLinkActive],
  template: ` <nav aria-label="Indicadores" class="indicator-nav">
    <a routerLink="/dashboard" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }"
      >Gráficos</a
    >
    <a routerLink="/dashboard/indicators" routerLinkActive="active">Catálogo de indicadores</a>
    <a routerLink="/dashboard/records" routerLinkActive="active">Registros mensuales</a>
  </nav>`,
  styles: `
    .indicator-nav {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
      margin: 1.25rem 0 1.5rem;
    }
    .indicator-nav a {
      padding: 0.75rem 1rem;
      border: 1px solid #d7e1ef;
      border-radius: 0.5rem;
      color: #003f7d;
      text-decoration: none;
      background: white;
    }
    .indicator-nav a.active {
      background: #003f7d;
      color: white;
    }
  `,
})
export class IndicatorsNav {}
