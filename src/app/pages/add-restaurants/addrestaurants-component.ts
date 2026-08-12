import {
  Component,
  OnInit,
  AfterViewInit,
  ElementRef,
  ViewChild,
  Inject,
  PLATFORM_ID
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SharedModule } from '../../shared.module';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { RestaurantService, MenuDto, RestaurantRequestDto, RestaurantDetailDto } from '../../services/restaurant.service';
import { ImageUploadService } from '../../services/image-upload.service';

@Component({
  selector: 'app-addrestaurants-component',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    SharedModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  templateUrl: './addrestaurants-component.html',
  styleUrl: './addrestaurants-component.scss',
})
export class AddrestaurantsComponent implements OnInit, AfterViewInit {
  @ViewChild('pickerMapContainer') pickerMapContainer!: ElementRef;

  private map: any;
  private L: any;
  private pickerMarker: any;

  restaurantId: string | null = null;
  isEditMode = false;
  isLoadingExistingData = false;
  activeStep = 1;

  name = '';
  description = '';
  imageUrl = '';
  status = 'ACTIVE';
  latitude: number = 13.7563;
  longitude: number = 100.5018;

  menus: MenuDto[] = [
    { name: '', price: 0, description: '', imageUrl: '' }
  ];

  isSubmitting = false;
  isUploadingCover = false;
  uploadingMenuIndex: number | null = null;
  errorMessage = '';

  constructor(
    private restaurantService: RestaurantService,
    private imageUploadService: ImageUploadService,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.restaurantId = id;
      this.isEditMode = true;
      this.loadExistingData(id);
    }
  }

  scrollToStep(stepNum: number): void {
    this.activeStep = stepNum;
    if (!isPlatformBrowser(this.platformId)) return;

    const targetId = `step-${stepNum}`;
    const el = document.getElementById(targetId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  private loadExistingData(id: string): void {
    this.isLoadingExistingData = true;
    this.restaurantService.getRestaurantById(id).subscribe({
      next: (detail: RestaurantDetailDto) => {
        this.name = detail.name || '';
        this.description = detail.description || '';
        this.imageUrl = detail.imageUrl || '';
        this.status = detail.status || 'ACTIVE';
        if (detail.latitude) this.latitude = Number(detail.latitude);
        if (detail.longitude) this.longitude = Number(detail.longitude);

        if (detail.menus && detail.menus.length > 0) {
          this.menus = detail.menus.map(m => ({
            id: m.id,
            menuCode: m.menuCode,
            name: m.name || '',
            price: Number(m.price) || 0,
            description: m.description || '',
            imageUrl: m.imageUrl || '',
            status: m.status || 'ACTIVE'
          }));
        }

        this.isLoadingExistingData = false;

        if (this.map && this.pickerMarker) {
          this.map.setView([this.latitude, this.longitude], 15);
          this.pickerMarker.setLatLng([this.latitude, this.longitude]);
        }
      },
      error: (err) => {
        console.error('Failed to load restaurant detail for edit:', err);
        this.isLoadingExistingData = false;
        this.snackBar.open('เกิดข้อผิดพลาดในการโหลดข้อมูลร้านค้า', 'ปิด', { duration: 3000 });
      }
    });
  }

  async ngAfterViewInit(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    this.L = await import('leaflet');
    this.fixLeafletIcons();
    this.initPickerMap();
  }

  private fixLeafletIcons(): void {
    const L = this.L.default ?? this.L;
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
    this.L = L;
  }

  private initPickerMap(): void {
    this.map = this.L.map(this.pickerMapContainer.nativeElement).setView(
      [this.latitude, this.longitude],
      14
    );

    this.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(this.map);

    this.pickerMarker = this.L.marker([this.latitude, this.longitude], {
      draggable: true
    }).addTo(this.map);

    this.pickerMarker.on('dragend', () => {
      const pos = this.pickerMarker.getLatLng();
      this.latitude = Number(pos.lat.toFixed(6));
      this.longitude = Number(pos.lng.toFixed(6));
    });

    this.map.on('click', (e: any) => {
      this.latitude = Number(e.latlng.lat.toFixed(6));
      this.longitude = Number(e.latlng.lng.toFixed(6));
      this.pickerMarker.setLatLng([this.latitude, this.longitude]);
    });

    if (!this.isEditMode) {
      this.useCurrentLocation();
    }
  }

  useCurrentLocation(): void {
    if (!isPlatformBrowser(this.platformId) || !navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.latitude = Number(pos.coords.latitude.toFixed(6));
        this.longitude = Number(pos.coords.longitude.toFixed(6));

        if (this.map && this.pickerMarker) {
          this.map.flyTo([this.latitude, this.longitude], 15);
          this.pickerMarker.setLatLng([this.latitude, this.longitude]);
        }
      },
      (err) => {
        console.error('Geolocation error:', err);
      }
    );
  }

  // --- Image Upload Handlers ---
  onCoverFileSelected(event: any): void {
    const file = event.target.files?.[0];
    if (!file) return;

    this.isUploadingCover = true;
    this.imageUploadService.uploadImage(file).subscribe({
      next: (url) => {
        this.imageUrl = url;
        this.isUploadingCover = false;
        this.snackBar.open('อัปโหลดรูปปกเรียบร้อยแล้ว', 'ตกลง', { duration: 2500 });
      },
      error: (err) => {
        console.error('Upload cover error:', err);
        this.isUploadingCover = false;
        this.snackBar.open('อัปโหลดรูปภาพล้มเหลว', 'ปิด', { duration: 3000 });
      }
    });
  }

  onMenuFileSelected(event: any, index: number): void {
    const file = event.target.files?.[0];
    if (!file) return;

    this.uploadingMenuIndex = index;
    this.imageUploadService.uploadImage(file).subscribe({
      next: (url) => {
        if (this.menus[index]) {
          this.menus[index].imageUrl = url;
        }
        this.uploadingMenuIndex = null;
        this.snackBar.open('อัปโหลดรูปเมนูเรียบร้อยแล้ว', 'ตกลง', { duration: 2500 });
      },
      error: (err) => {
        console.error('Upload menu image error:', err);
        this.uploadingMenuIndex = null;
        this.snackBar.open('อัปโหลดรูปเมนูล้มเหลว', 'ปิด', { duration: 3000 });
      }
    });
  }

  clearCoverImage(): void {
    this.imageUrl = '';
  }

  clearMenuImage(index: number): void {
    if (this.menus[index]) {
      this.menus[index].imageUrl = '';
    }
  }

  addMenuField(): void {
    this.menus.push({ name: '', price: 0, description: '', imageUrl: '' });
  }

  removeMenuField(index: number): void {
    this.menus.splice(index, 1);
  }

  onSubmit(): void {
    if (!this.name.trim()) {
      this.errorMessage = 'กรุณากรอกชื่อร้านอาหาร';
      return;
    }
    if (!this.latitude || !this.longitude) {
      this.errorMessage = 'กรุณาเลือกพิกัดตำแหน่งร้านอาหารบนแผนที่';
      return;
    }

    this.errorMessage = '';
    this.isSubmitting = true;

    const validMenus = this.menus
      .filter((m) => m.name && m.name.trim() !== '')
      .map((m) => ({
        id: m.id,
        menuCode: m.menuCode,
        name: m.name.trim(),
        price: Number(m.price) || 0,
        description: m.description ? m.description.trim() : '',
        imageUrl: m.imageUrl ? m.imageUrl.trim() : '',
        status: m.status || 'ACTIVE'
      }));

    const payload: RestaurantRequestDto = {
      name: this.name.trim(),
      description: this.description ? this.description.trim() : '',
      imageUrl: this.imageUrl ? this.imageUrl.trim() : '',
      status: this.status,
      latitude: Number(this.latitude),
      longitude: Number(this.longitude),
      menus: validMenus
    };

    if (this.isEditMode && this.restaurantId) {
      this.restaurantService.updateRestaurant(this.restaurantId, payload).subscribe({
        next: (res) => {
          this.isSubmitting = false;
          this.snackBar.open('อัปเดตข้อมูลร้านอาหารสำเร็จ', 'ปิด', {
            duration: 3500,
            horizontalPosition: 'center',
            verticalPosition: 'bottom',
            panelClass: ['success-toast']
          });
          this.router.navigate(['/home']);
        },
        error: (err) => {
          console.error('Update restaurant error:', err);
          this.isSubmitting = false;
          this.errorMessage = 'เกิดข้อผิดพลาดในการอัปเดตข้อมูลร้านอาหาร';
          this.snackBar.open('เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'ปิด', {
            duration: 3500,
            horizontalPosition: 'center',
            verticalPosition: 'bottom',
            panelClass: ['error-toast']
          });
        }
      });
    } else {
      this.restaurantService.createRestaurant(payload).subscribe({
        next: (res) => {
          this.isSubmitting = false;
          this.snackBar.open('เพิ่มร้านอาหารสำเร็จ', 'ปิด', {
            duration: 3500,
            horizontalPosition: 'center',
            verticalPosition: 'bottom',
            panelClass: ['success-toast']
          });
          this.router.navigate(['/home']);
        },
        error: (err) => {
          console.error('Create restaurant error:', err);
          this.isSubmitting = false;
          this.errorMessage = 'เกิดข้อผิดพลาดในการบันทึกข้อมูลร้านอาหาร';
          this.snackBar.open('เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'ปิด', {
            duration: 3500,
            horizontalPosition: 'center',
            verticalPosition: 'bottom',
            panelClass: ['error-toast']
          });
        }
      });
    }
  }
}
