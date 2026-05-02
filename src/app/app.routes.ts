import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/HomeComponent';
import { AddrestaurantsComponent } from './pages/add-restaurants/addrestaurants-component';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' }, 
  { path: 'home', component: HomeComponent },
  { path: 'add-restaurant', component: AddrestaurantsComponent },
  { path: '**', redirectTo: 'home' }
];