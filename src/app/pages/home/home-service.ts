import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HomePinLocationsDto } from './dto/HomePinLocationsDto';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class HomeService {
  constructor(
    private http: HttpClient,
  ) { }

  private baseUrl = environment.apiUrl+"/home"

  getRestaurantMaps(): Observable<HomePinLocationsDto[]> {
    return this.http.get<HomePinLocationsDto[]>(
      `${this.baseUrl}/pins`
    );
  } 

}
