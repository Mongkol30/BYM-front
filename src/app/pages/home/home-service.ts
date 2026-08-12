import { HttpClient, HttpParams } from '@angular/common/http';
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

  private baseUrl = environment.apiUrl + "/home";

  getRestaurantMaps(search?: string): Observable<HomePinLocationsDto[]> {
    let params = new HttpParams();
    if (search && search.trim()) {
      params = params.set('search', search.trim());
    }
    return this.http.get<HomePinLocationsDto[]>(
      `${this.baseUrl}/pins`,
      { params }
    );
  } 
}
