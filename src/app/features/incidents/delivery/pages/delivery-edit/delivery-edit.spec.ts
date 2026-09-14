import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DeliveryEdit } from './delivery-edit';

describe('DeliveryEdit', () => {
  let component: DeliveryEdit;
  let fixture: ComponentFixture<DeliveryEdit>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeliveryEdit],
    }).compileComponents();

    fixture = TestBed.createComponent(DeliveryEdit);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
