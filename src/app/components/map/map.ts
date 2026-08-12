import {
  Component,
  OnDestroy,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnChanges,
  SimpleChanges,
  Input,
  Output,
  EventEmitter,
  PLATFORM_ID,
  Inject
} from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [
    CommonModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    FormsModule
  ],
  templateUrl: './map.html',
  styleUrls: ['./map.scss']
})
export class MapComponent implements AfterViewInit, OnDestroy, OnChanges {
  @ViewChild('mapContainer') mapContainer!: ElementRef;

  @Input() pinLocations: any[] = [];
  @Output() selectRestaurant = new EventEmitter<string>();
  @Output() searchChange = new EventEmitter<string>();

  private map: any;
  private L: any;
  private currentMarker: any;
  private restaurantMarkers: any[] = [];

  searchQuery = '';
  isLoading = true;
  searchError = '';
  myIcon: any = '';

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object
  ) { }

  async ngAfterViewInit(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    const leafletModule = await import('leaflet');
    this.L = leafletModule.default || leafletModule;

    this.fixLeafletIcons();
    this.initMap();

    this.myIcon = this.L.divIcon({
      html: `
        <div class="user-location-pin">
          <div class="user-dot"></div>
          <div class="user-pulse"></div>
        </div>
      `,
      className: 'user-pin-wrapper',
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });
  }

  private fixLeafletIcons(): void {
    if (!this.L) return;
    delete (this.L.Icon.Default.prototype as any)._getIconUrl;

    this.L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['pinLocations'] && this.map) {
      this.loadRestaurantPins();
    }
  }

  private initMap(): void {
    if (!this.L || !this.mapContainer?.nativeElement) return;

    this.map = this.L.map(this.mapContainer.nativeElement, {
      zoomControl: false
    }).setView(
      [13.7563, 100.5018],
      12
    );

    this.L.control.zoom({ position: 'bottomleft' }).addTo(this.map);

    this.L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
      }
    ).addTo(this.map);

    this.isLoading = false;

    this.getCurrentLocation();

    if (this.pinLocations.length > 0) {
      this.loadRestaurantPins();
    }
  }

  private loadRestaurantPins(): void {
    if (!this.map || !this.L) return;

    this.restaurantMarkers.forEach(marker => this.map.removeLayer(marker));
    this.restaurantMarkers = [];

    if (!this.pinLocations?.length) {
      return;
    }

    this.pinLocations.forEach((item) => {
      if (!item.latitude || !item.longitude) return;

      const customPinHtml = `
        <div class="custom-food-pin">
          <div class="pin-badge">
            <span class="pin-emoji">🍽️</span>
          </div>
          <div class="pin-tail"></div>
          <div class="pin-shadow"></div>
        </div>
      `;

      const customIcon = this.L.divIcon({
        html: customPinHtml,
        className: 'food-marker-container',
        iconSize: [40, 48],
        iconAnchor: [20, 48],
        popupAnchor: [0, -44]
      });

      const marker = this.L.marker(
        [Number(item.latitude), Number(item.longitude)],
        {
          icon: customIcon,
          title: item.restaurantName,
          riseOnHover: true,
          draggable: false
        }
      )
      .addTo(this.map)
      .bindPopup(`
        <div class="custom-popup-box">
          <b class="popup-title">${item.restaurantName}</b>
          <p class="popup-hint">👇 กดเพื่อดูรายละเอียดร้าน & เมนู</p>
        </div>
      `);

      marker.on('click', () => {
        if (item.restaurantId) {
          this.selectRestaurant.emit(item.restaurantId);
        }
      });

      this.restaurantMarkers.push(marker);
    });
  }

  getCurrentLocation(): void {
    if (!isPlatformBrowser(this.platformId) || !this.L) return;
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;

        if (this.currentMarker) {
          this.map.removeLayer(this.currentMarker);
        }

        this.currentMarker = this.L.marker(
          [latitude, longitude],
          { icon: this.myIcon }
        ).addTo(this.map);

        this.flyToLocation(latitude, longitude, 15);
      },
      (error) => {
        console.error('Geolocation error:', error);
      }
    );
  }

  flyToLocation(latitude: number, longitude: number, zoom = 16): void {
    if (!this.map) return;
    this.map.flyTo([latitude, longitude], zoom, {
      animate: true,
      duration: 1.5
    });
  }

  onSearch(): void {
    this.searchChange.emit(this.searchQuery);
    if (this.searchQuery.trim()) {
      this.searchPlace();
    }
  }

  async searchPlace(): Promise<void> {
    if (!this.searchQuery.trim()) return;

    this.searchError = '';

    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      this.searchQuery
    )}&format=json&limit=1&accept-language=th`;

    try {
      const res = await fetch(url, {
        headers: {
          'Accept-Language': 'th'
        }
      });

      const data = await res.json();

      if (data.length > 0) {
        const { lat, lon } = data[0];
        this.flyToLocation(Number(lat), Number(lon), 14);
      } else {
        this.searchError = 'ไม่พบสถานที่ที่ค้นหา';
      }
    } catch (error) {
      console.error(error);
      this.searchError = 'เกิดข้อผิดพลาด กรุณาลองใหม่';
    }
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }
}