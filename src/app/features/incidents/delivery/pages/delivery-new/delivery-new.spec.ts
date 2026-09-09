import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DeliveryNew } from './delivery-new';

describe('DeliveryNew', () => {
  let component: DeliveryNew;
  let fixture: ComponentFixture<DeliveryNew>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeliveryNew],
    }).compileComponents();

    fixture = TestBed.createComponent(DeliveryNew);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
