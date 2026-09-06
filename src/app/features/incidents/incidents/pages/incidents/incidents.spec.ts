import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Incidents } from './incidents';

describe('Incidents', () => {
  let component: Incidents;
  let fixture: ComponentFixture<Incidents>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Incidents],
    }).compileComponents();

    fixture = TestBed.createComponent(Incidents);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
