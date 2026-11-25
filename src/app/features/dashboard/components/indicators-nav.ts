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
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      grid-auto-rows: 1fr;
      gap: 0.5rem;
      margin: 1.25rem 0 1.5rem;
    }
    .indicator-nav a {
      display: flex;
      align-items: center;
      justify-content: center;
      box-sizing: border-box;
      min-width: 0;
      min-height: 3rem;
      text-align: center;
      line-height: 1.25;
      padding: 0.75rem 1rem;
      border: 1px solid #d7e1ef;
      border-radius: 0.5rem;
      color: #003f7d;
      text-decoration: none;
      background: white;
    }
    @media (max-width: 40rem) {
      .indicator-nav {
        grid-template-columns: minmax(0, 1fr);
      }
    }
    .indicator-nav a.active {
      background: #003f7d;
      color: white;
    }
  `,
})
export class IndicatorsNav {}
