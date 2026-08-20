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
import { MatExpansionModule } from '@angular/material/expansion';
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
    MatSnackBarModule,
    MatExpansionModule
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
  isMapFullscreen = false;

  name = '';
  description = '';
  imageUrl = '';
  status = 'ACTIVE';
  latitude: number = 13.7563;
  longitude: number = 100.5018;

  mainDishMenus: MenuDto[] = [
    { name: '', price: 0, description: '', imageUrl: '', category: 'MAIN_DISH' }
  ];
  toppingMenus: MenuDto[] = [
    { name: '', price: 0, description: '', imageUrl: '', category: 'TOPPING_SNACK' }
  ];
  beverageMenus: MenuDto[] = [
    { name: '', price: 0, description: '', imageUrl: '', category: 'BEVERAGE' }
  ];

  isSubmitting = false;
  isUploadingCover = false;
  isExtractingMenu = false;
  uploadingMenuId: string | null = null;
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
          this.mainDishMenus = [];
          this.toppingMenus = [];
          this.beverageMenus = [];
          detail.menus.forEach(m => {
            const parsedMenu = {
              id: m.id,
              menuCode: m.menuCode,
              name: m.name || '',
              price: Number(m.price) || 0,
              description: m.description || '',
              imageUrl: m.imageUrl || '',
              status: m.status || 'ACTIVE',
              category: m.category || 'MAIN_DISH'
            };
            if (parsedMenu.category === 'TOPPING_SNACK') this.toppingMenus.push(parsedMenu);
            else if (parsedMenu.category === 'BEVERAGE') this.beverageMenus.push(parsedMenu);
            else this.mainDishMenus.push(parsedMenu);
          });
          
          if (this.mainDishMenus.length === 0) this.mainDishMenus.push({ name: '', price: 0, description: '', imageUrl: '', category: 'MAIN_DISH' });
          if (this.toppingMenus.length === 0) this.toppingMenus.push({ name: '', price: 0, description: '', imageUrl: '', category: 'TOPPING_SNACK' });
          if (this.beverageMenus.length === 0) this.beverageMenus.push({ name: '', price: 0, description: '', imageUrl: '', category: 'BEVERAGE' });
        }

        this.isLoadingExistingData = false;

        setTimeout(async () => {
          await this.tryInitMap();
          if (this.map && this.pickerMarker) {
            this.map.setView([this.latitude, this.longitude], 15);
            this.pickerMarker.setLatLng([this.latitude, this.longitude]);
          }
        }, 50);
      },
      error: (err) => {
        console.error('Failed to load restaurant detail for edit:', err);
        this.isLoadingExistingData = false;
        this.snackBar.open('เกิดข้อผิดพลาดในการโหลดข้อมูลร้านค้า', 'ปิด', { duration: 3000, panelClass: ['error-toast'] });
      }
    });
  }

  async ngAfterViewInit(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    if (!this.isEditMode) {
      await this.tryInitMap();
    }
  }

  private async tryInitMap(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    if (!this.L) {
      const leafletModule = await import('leaflet');
      this.L = leafletModule.default || leafletModule;
      this.fixLeafletIcons();
    }
    if (!this.map) {
      this.initPickerMap();
    }
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

  private initPickerMap(): void {
    if (!this.L || !this.pickerMapContainer?.nativeElement) return;

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
    if (!isPlatformBrowser(this.platformId) || !this.L) return;
    if (!navigator.geolocation) return;

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
        this.snackBar.open('อัปโหลดรูปปกเรียบร้อยแล้ว', 'ตกลง', { duration: 2500, panelClass: ['success-toast'] });
      },
      error: (err) => {
        console.error('Upload cover error:', err);
        this.isUploadingCover = false;
        this.snackBar.open('อัปโหลดรูปภาพล้มเหลว', 'ปิด', { duration: 3000, panelClass: ['error-toast'] });
      }
    });
  }

  onMenuFileSelected(event: any, category: string, index: number): void {
    const file = event.target.files?.[0];
    if (!file) return;

    this.uploadingMenuId = `${category}_${index}`;
    this.imageUploadService.uploadImage(file).subscribe({
      next: (url) => {
        let menuArr = this.getMenuArray(category);
        if (menuArr[index]) {
          menuArr[index].imageUrl = url;
        }
        this.uploadingMenuId = null;
        this.snackBar.open('อัปโหลดรูปเมนูเรียบร้อยแล้ว', 'ตกลง', { duration: 2500, panelClass: ['success-toast'] });
      },
      error: (err) => {
        console.error('Upload menu image error:', err);
        this.uploadingMenuId = null;
        this.snackBar.open('อัปโหลดรูปเมนูล้มเหลว', 'ปิด', { duration: 3000, panelClass: ['error-toast'] });
      }
    });
  }

  onAutoExtractMenuFileSelected(event: any): void {
    const file = event.target.files?.[0];
    if (!file) return;

    this.isExtractingMenu = true;
    this.snackBar.open('กำลังบีบอัดรูปและสแกนด้วย AI...', '', { duration: 2000, panelClass: ['info-toast'] });

    this.imageUploadService.fileToCompressedBase64(file, 800).then(base64 => {
      this.restaurantService.extractMenuFromBase64(base64).subscribe({
        next: (extractedMenus: MenuDto[]) => {
          this.isExtractingMenu = false;
          if (extractedMenus && extractedMenus.length > 0) {
            
            // Remove empty rows
            this.mainDishMenus = this.mainDishMenus.filter(m => m.name.trim() !== '' || Number(m.price) > 0 || m.imageUrl !== '');
            this.toppingMenus = this.toppingMenus.filter(m => m.name.trim() !== '' || Number(m.price) > 0 || m.imageUrl !== '');
            this.beverageMenus = this.beverageMenus.filter(m => m.name.trim() !== '' || Number(m.price) > 0 || m.imageUrl !== '');
            
            // Append extracted menus
            extractedMenus.forEach(em => {
              const cat = em.category || 'MAIN_DISH';
              const newMenu = {
                name: em.name || '',
                price: em.price || 0,
                description: '',
                imageUrl: '',
                category: cat
              };
              if (cat === 'TOPPING_SNACK') this.toppingMenus.unshift(newMenu);
              else if (cat === 'BEVERAGE') this.beverageMenus.unshift(newMenu);
              else this.mainDishMenus.unshift(newMenu);
            });
            
            if (this.mainDishMenus.length === 0) this.addMenuField('MAIN_DISH');
            if (this.toppingMenus.length === 0) this.addMenuField('TOPPING_SNACK');
            if (this.beverageMenus.length === 0) this.addMenuField('BEVERAGE');

            this.snackBar.open(`เพิ่มข้อมูลเมนูอัตโนมัติ ${extractedMenus.length} รายการ`, 'ตกลง', { duration: 3500, panelClass: ['success-toast'] });
          } else {
            this.snackBar.open('ไม่พบข้อมูลเมนูในรูปภาพ', 'ปิด', { duration: 3000, panelClass: ['info-toast'] });
          }
        },
        error: (err) => {
          console.error('Extract menu error:', err);
          this.isExtractingMenu = false;
          let errMsg = 'สแกนเมนูล้มเหลว';
          if (err.error && typeof err.error === 'string' && err.error.includes('Gemini API Key is missing')) {
            errMsg = 'ยังไม่ได้ตั้งค่า Gemini API Key ในระบบ Backend';
          }
          this.snackBar.open(errMsg, 'ปิด', { duration: 4000, panelClass: ['error-toast'] });
        }
      });
    }).catch(err => {
      console.error('Compression error:', err);
      this.isExtractingMenu = false;
      this.snackBar.open('เกิดข้อผิดพลาดในการจัดการรูปภาพ', 'ปิด', { duration: 3000, panelClass: ['error-toast'] });
    });
    
    event.target.value = null;
  }

  clearCoverImage(): void {
    this.imageUrl = '';
  }

  clearMenuImage(category: string, index: number): void {
    let menuArr = this.getMenuArray(category);
    if (menuArr[index]) {
      menuArr[index].imageUrl = '';
    }
  }

  getMenuArray(category: string): MenuDto[] {
    if (category === 'TOPPING_SNACK') return this.toppingMenus;
    if (category === 'BEVERAGE') return this.beverageMenus;
    return this.mainDishMenus;
  }

  addMenuField(category: string): void {
    this.getMenuArray(category).unshift({ name: '', price: 0, description: '', imageUrl: '', category });
  }

  removeMenuField(category: string, index: number): void {
    this.getMenuArray(category).splice(index, 1);
  }

  toggleMapFullscreen(): void {
    this.isMapFullscreen = !this.isMapFullscreen;
    if (this.map) {
      setTimeout(() => {
        this.map.invalidateSize();
      }, 300);
    }
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

    const allMenus = [...this.mainDishMenus, ...this.toppingMenus, ...this.beverageMenus];
    const validMenus = allMenus
      .filter((m) => m.name && m.name.trim() !== '')
      .map((m) => ({
        id: m.id,
        menuCode: m.menuCode,
        name: m.name.trim(),
        price: Number(m.price) || 0,
        description: m.description ? m.description.trim() : '',
        imageUrl: m.imageUrl ? m.imageUrl.trim() : '',
        status: m.status || 'ACTIVE',
        category: m.category || 'MAIN_DISH'
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
