import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddrestaurantsComponent } from './addrestaurants-component';

describe('AddrestaurantsComponent', () => {
  let component: AddrestaurantsComponent;
  let fixture: ComponentFixture<AddrestaurantsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddrestaurantsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AddrestaurantsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
