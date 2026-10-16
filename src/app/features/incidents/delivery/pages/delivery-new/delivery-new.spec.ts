import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { DeliveryNew } from './delivery-new';
import { DeliveryService } from '../../services/delivery.service';
import { AuthService } from '../../../../auth/services/auth.service';

describe('New Delivery responsible selection', () => {
  function setup() {
    TestBed.configureTestingModule({imports:[DeliveryNew], providers:[provideRouter([]),
      {provide:AuthService,useValue:{currentUser:()=>({permissions:['deliveries.read','deliveries.write']})}},
      {provide:DeliveryService,useValue:{getCreateOptions:()=>of({cities:[],nodes:[],deliveryTypes:[],deliveryStatuses:[],deliveryTechnologies:[],landlords:[],eaims:[{id:1,name:'A'},{id:2,name:'B'}],deliveryCauses:[],responsibles:[{id:10,name:'User A',eaimId:1},{id:20,name:'User B',eaimId:2},{id:30,name:'Internal',eaimId:null}]})}},
    ]});
    const fixture=TestBed.createComponent(DeliveryNew);fixture.detectChanges();return {component:fixture.componentInstance,fixture};
  }
  it('shows no responsible before selecting an EAIM',()=>{
    const {component}=setup();expect(component.filteredResponsibles()).toEqual([]);
  });
  it('includes only users attached to the selected EAIM',()=>{
    const {component}=setup();component.form.controls.eaim.setValue(1);
    expect(component.filteredResponsibles().map(u=>u.id)).toEqual([10]);
    component.form.controls.eaim.setValue(2);expect(component.filteredResponsibles().map(u=>u.id)).toEqual([20]);
  });
  it('clears the responsible when changing or clearing EAIM',()=>{
    const {component}=setup();component.form.controls.eaim.setValue(1);component.form.controls.responsible.setValue(10);
    component.form.controls.eaim.setValue(2);expect(component.form.controls.responsible.value).toBeNull();
    component.form.controls.responsible.setValue(20);component.form.controls.eaim.setValue(null);
    expect(component.form.controls.responsible.value).toBeNull();expect(component.filteredResponsibles()).toEqual([]);
  });
});
