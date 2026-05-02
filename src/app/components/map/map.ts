import {
  Component,
  OnDestroy,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnChanges,
  SimpleChanges,
  Input,
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
export class MapComponent
  implements AfterViewInit, OnDestroy, OnChanges {

  @ViewChild('mapContainer') mapContainer!: ElementRef;

  @Input() pinLocations: any[] = [];

  private map: any;
  private L: any;
  private currentMarker: any;

  searchQuery = '';
  isLoading = true;
  searchError = '';

  myIcon: any = '';

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object
  ) { }

  async ngAfterViewInit(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    this.L = await import('leaflet');
    this.fixLeafletIcons();
    this.initMap();
    this.myIcon = this.L.divIcon({
      html: `
            <div style="
              background:#1976d2;
              width:16px;
              height:16px;
              border-radius:50%;
              border:3px solid white;
              box-shadow:0 2px 6px rgba(0,0,0,0.4)">
            </div>
          `,
      className: '',
      iconSize: [16, 16],
      iconAnchor: [8, 8]
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes['pinLocations'] &&
      this.map &&
      this.pinLocations.length > 0
    ) {
      console.log('pinLocations:', this.pinLocations);
      this.loadRestaurantPins();
    }
  }

  private fixLeafletIcons(): void {
    const L = this.L.default ?? this.L;  // รองรับทั้ง 2 กรณี

    delete (L.Icon.Default.prototype as any)._getIconUrl;

    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });

    this.L = L;  // ← เขียนทับด้วย L ที่ถูกต้อง
  }

  private initMap(): void {
    this.map = this.L.map(this.mapContainer.nativeElement).setView(
      [13.7563, 100.5018], // Bangkok
      12
    );

    this.L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        attribution:
          '© OpenStreetMap',
        maxZoom: 19
      }
    ).addTo(this.map);

    this.isLoading = false;

    this.getCurrentLocation();

    // ถ้า API มาก่อน map render
    if (this.pinLocations.length > 0) {
      this.loadRestaurantPins();
    }
  }

  private loadRestaurantPins(): void {
    if (!this.pinLocations?.length) {
      console.log('ไม่มีข้อมูล pin');
      return;
    }

    this.pinLocations.forEach((item) => {
      this.L.marker([
        Number(item.latitude),
        Number(item.longitude)
      ],
        {
          title: item.restaurantName,
          riseOnHover: true,
          draggable: false
        })
        .addTo(this.map)
        .bindPopup(`
          <b>${item.restaurantName}</b>
        `);
    });
  }

  getCurrentLocation(): void {
    if (!isPlatformBrowser(this.platformId)) return;
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
        )
          .addTo(this.map)
          .bindPopup('<b>📍 ตำแหน่งของคุณ</b>')
          .openPopup();

        this.map.flyTo(
          [latitude, longitude],
          15
        );
      },
      (error) => {
        console.error('Geolocation error:', error);
      }
    );
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
        const { lat, lon, display_name } = data[0];

        this.L.marker([
          Number(lat),
          Number(lon)
        ])
          .addTo(this.map)
          .bindPopup(`<b>📍 ${display_name}</b>`)
          .openPopup();

        this.map.flyTo(
          [Number(lat), Number(lon)],
          15
        );
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