import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MapComponent } from '../../components/map/map';
import { HomeService } from './home-service';
import { HomePinLocationsDto } from './dto/HomePinLocationsDto';
import { RestaurantService, RestaurantDetailDto } from '../../services/restaurant.service';
import { SharedModule } from '../../shared.module';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MapComponent,
    SharedModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  templateUrl: './home.html',
  styleUrl: './home.scss'
})
export class HomeComponent implements OnInit {
  @ViewChild(MapComponent) mapComponent!: MapComponent;

  pinLocations: HomePinLocationsDto[] = [];
  selectedRestaurant: RestaurantDetailDto | null = null;
  isLoadingDetail = false;
  currentSearch = '';

  showDeleteModal = false;
  targetDeleteId: string | null = null;
  isDeleting = false;

  // Randomizer Lucky Spin state
  showRandomizerModal = false;
  isSpinning = false;
  shuffleName = 'กำลังสุ่ม...';
  randomWinner: HomePinLocationsDto | null = null;
  private spinTimer: any;

  constructor(
    private homeService: HomeService,
    private restaurantService: RestaurantService,
    private snackBar: MatSnackBar
  ) { }

  ngOnInit(): void {
    this.loadPins();
  }

  loadPins(search?: string): void {
    this.currentSearch = search || '';
    this.homeService.getRestaurantMaps(this.currentSearch).subscribe({
      next: (response: HomePinLocationsDto[]) => {
        this.pinLocations = response;
      },
      error: (error) => {
        console.error('Failed to load pins:', error);
        this.pinLocations = [];
      }
    });
  }

  onSearchChange(search: string): void {
    this.loadPins(search);
  }

  onRestaurantSelected(restaurantId: string): void {
    this.isLoadingDetail = true;
    this.selectedRestaurant = null;

    this.restaurantService.getRestaurantById(restaurantId).subscribe({
      next: (detail: RestaurantDetailDto) => {
        this.selectedRestaurant = detail;
        this.isLoadingDetail = false;
      },
      error: (err) => {
        console.error('Failed to load restaurant detail:', err);
        this.isLoadingDetail = false;
      }
    });
  }

  closeSidebar(): void {
    this.selectedRestaurant = null;
  }

  // --- Randomizer "วันนี้กินอะไรดี?" Logic ---
  openRandomizer(): void {
    if (!this.pinLocations || this.pinLocations.length === 0) {
      this.snackBar.open('⚠️ ยังไม่มีข้อมูลร้านอาหารบนแผนที่สำหรับสุ่ม', 'ปิด', {
        duration: 3500,
        horizontalPosition: 'center',
        verticalPosition: 'bottom',
        panelClass: ['info-toast']
      });
      return;
    }

    this.showRandomizerModal = true;
    this.randomWinner = null;
    this.spin();
  }

  spin(): void {
    if (this.spinTimer) clearInterval(this.spinTimer);
    this.isSpinning = true;
    this.randomWinner = null;

    let step = 0;
    const maxSteps = 30; // ~2.5 seconds animation

    this.spinTimer = setInterval(() => {
      step++;
      const randomIndex = Math.floor(Math.random() * this.pinLocations.length);
      this.shuffleName = this.pinLocations[randomIndex].restaurantName;

      if (step >= maxSteps) {
        clearInterval(this.spinTimer);
        this.isSpinning = false;
        this.randomWinner = this.pinLocations[randomIndex];
      }
    }, 80);
  }

  applyWinner(): void {
    if (!this.randomWinner) return;

    const winner = this.randomWinner;
    this.closeRandomizer();

    // Fly Leaflet Map to Winner position
    if (this.mapComponent) {
      this.mapComponent.flyToLocation(Number(winner.latitude), Number(winner.longitude), 16);
    }

    // Open Sidebar Detail
    this.onRestaurantSelected(winner.restaurantId);
  }

  closeRandomizer(): void {
    if (this.spinTimer) clearInterval(this.spinTimer);
    this.showRandomizerModal = false;
    this.isSpinning = false;
    this.randomWinner = null;
  }

  // --- Delete Logic ---
  promptDelete(id: string): void {
    this.targetDeleteId = id;
    this.showDeleteModal = true;
  }

  cancelDelete(): void {
    this.showDeleteModal = false;
    this.targetDeleteId = null;
  }

  confirmDelete(): void {
    if (!this.targetDeleteId) return;

    this.isDeleting = true;
    this.restaurantService.deleteRestaurant(this.targetDeleteId).subscribe({
      next: () => {
        this.isDeleting = false;
        this.showDeleteModal = false;
        this.targetDeleteId = null;
        this.closeSidebar();

        this.snackBar.open('🗑️ ลบร้านอาหารเรียบร้อยแล้ว', 'ปิด', {
          duration: 3500,
          horizontalPosition: 'center',
          verticalPosition: 'bottom',
          panelClass: ['info-toast']
        });

        this.loadPins(this.currentSearch);
      },
      error: (err) => {
        console.error('Failed to delete restaurant:', err);
        this.isDeleting = false;
        this.showDeleteModal = false;

        this.snackBar.open('❌ เกิดข้อผิดพลาดในการลบร้านอาหาร', 'ปิด', {
          duration: 3500,
          horizontalPosition: 'center',
          verticalPosition: 'bottom',
          panelClass: ['error-toast']
        });
      }
    });
  }
}