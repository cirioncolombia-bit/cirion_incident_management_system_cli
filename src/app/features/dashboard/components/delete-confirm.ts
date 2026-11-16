import { Component, ElementRef, input, output, viewChild } from '@angular/core';
@Component({
  selector: 'app-delete-confirm',
  template: ` <dialog
    #panel
    aria-labelledby="indicator-delete-title"
    (cancel)="$event.preventDefault(); close()"
  >
    <h2 id="indicator-delete-title">Confirmar eliminación</h2>
    <p>{{ message() }}</p>
    <div>
      <button type="button" (click)="close()">Cancelar</button
      ><button type="button" class="danger" (click)="confirm()">Eliminar</button>
    </div>
  </dialog>`,
  styles: `
    dialog {
      border: 1px solid #d7e1ef;
      border-radius: 0.75rem;
      padding: 1.5rem;
      max-width: min(28rem, calc(100vw - 2rem));
      color: #12365b;
    }
    dialog::backdrop {
      background: #001a3580;
    }
    h2 {
      font-size: 1.25rem;
      margin-top: 0;
    }
    p {
      line-height: 1.6;
    }
    div {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
    }
    button {
      font: inherit;
      border: 1px solid #cbd8e8;
      border-radius: 0.5rem;
      padding: 0.75rem;
      cursor: pointer;
      background: white;
    }
    .danger {
      color: white;
      background: #aa2433;
    }
  `,
})
export class DeleteConfirm {
  readonly message = input('');
  readonly confirmed = output<void>();
  private readonly panel = viewChild.required<ElementRef<HTMLDialogElement>>('panel');
  open() {
    this.panel().nativeElement.showModal();
  }
  close() {
    this.panel().nativeElement.close();
  }
  confirm() {
    this.close();
    this.confirmed.emit();
  }
}
