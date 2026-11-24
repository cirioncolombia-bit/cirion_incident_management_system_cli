import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { Login } from './login';

describe('Login password visibility', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [provideRouter([]), { provide: AuthService, useValue: {} }],
    }).compileComponents();
  });

  function setup() {
    const fixture = TestBed.createComponent(Login);
    fixture.componentInstance.form.controls.password.setValue('Example password');
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('#password') as HTMLInputElement;
    const button = fixture.nativeElement.querySelector('.login__password-reveal') as HTMLButtonElement;
    const send = (event: Event, target: EventTarget = button) => {
      target.dispatchEvent(event);
      fixture.detectChanges();
    };
    return { fixture, input, button, send };
  }

  it('only reveals while the primary pointer is held and preserves the password', () => {
    const { input, button, send } = setup();
    expect(input.type).toBe('password');
    expect(button.type).toBe('button');
    send(new MouseEvent('pointerdown', { button: 0 }));
    expect(input.type).toBe('text');
    expect(button.getAttribute('aria-pressed')).toBe('true');
    send(new Event('pointerup'), window);
    expect(input.type).toBe('password');
    expect(input.value).toBe('Example password');
  });

  it('does not reveal on right click or a normal click', () => {
    const { input, send } = setup();
    send(new MouseEvent('pointerdown', { button: 2 }));
    send(new MouseEvent('click'));
    expect(input.type).toBe('password');
  });

  for (const type of ['pointercancel', 'pointerleave', 'blur']) {
    it(`hides when the button receives ${type}`, () => {
      const { input, send } = setup();
      send(new MouseEvent('pointerdown', { button: 0 }));
      send(new Event(type));
      expect(input.type).toBe('password');
    });
  }

  it('hides when the window loses focus or the page visibility changes', () => {
    const { input, send } = setup();
    for (const [type, target] of [['blur', window], ['visibilitychange', document]] as const) {
      send(new MouseEvent('pointerdown', { button: 0 }));
      send(new Event(type), target);
      expect(input.type).toBe('password');
    }
  });

  for (const key of [' ', 'Enter']) {
    it(`supports holding and releasing the ${JSON.stringify(key)} key without submitting`, () => {
      const { input, fixture, send } = setup();
      const down = new KeyboardEvent('keydown', { key, cancelable: true });
      send(down);
      expect(down.defaultPrevented).toBe(true);
      expect(input.type).toBe('text');
      send(new KeyboardEvent('keyup', { key }));
      expect(input.type).toBe('password');
      expect(fixture.componentInstance.form.controls.email.touched).toBe(false);
    });
  }
});
