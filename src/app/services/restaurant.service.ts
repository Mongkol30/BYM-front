import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../environments/environment';
import { Observable } from 'rxjs';

export interface MenuDto {
  id?: string;
  menuCode?: string;
  name: string;
  price: number;
  description?: string;
  imageUrl?: string;
  status?: string;
}

export interface RestaurantRequestDto {
  name: string;
  description?: string;
  imageUrl?: string;
  status?: string;
  latitude: number;
  longitude: number;
  menus?: MenuDto[];
}

export interface RestaurantDetailDto {
  id: string;
  resCode?: string;
  name: string;
  description?: string;
  imageUrl?: string;
  status: string;
  locationId?: string;
  latitude: number;
  longitude: number;
  menus: MenuDto[];
}

@Injectable({
  providedIn: 'root',
})
export class RestaurantService {
  private apiUrl = `${environment.apiUrl}/api/restaurants`;

  constructor(private http: HttpClient) {}

  getRestaurantById(id: string): Observable<RestaurantDetailDto> {
    return this.http.get<RestaurantDetailDto>(`${this.apiUrl}/${id}`);
  }

  createRestaurant(dto: RestaurantRequestDto): Observable<RestaurantDetailDto> {
    return this.http.post<RestaurantDetailDto>(this.apiUrl, dto);
  }

  updateRestaurant(id: string, dto: RestaurantRequestDto): Observable<RestaurantDetailDto> {
    return this.http.put<RestaurantDetailDto>(`${this.apiUrl}/${id}`, dto);
  }

  deleteRestaurant(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  getPins(search?: string): Observable<any[]> {
    let params = new HttpParams();
    if (search && search.trim()) {
      params = params.set('search', search.trim());
    }
    return this.http.get<any[]>(`${environment.apiUrl}/home/pins`, { params });
  }
}
