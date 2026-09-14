import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DeliveryDetail } from './delivery-detail';

describe('DeliveryDetail', () => {
  let component: DeliveryDetail;
  let fixture: ComponentFixture<DeliveryDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeliveryDetail],
    }).compileComponents();

    fixture = TestBed.createComponent(DeliveryDetail);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
