import { Component } from '@angular/core';
import { MapComponent } from '../../components/map/map';
import { HomeService } from './home-service';
import { HomePinLocationsDto } from './dto/HomePinLocationsDto';
import { SharedModule } from '../../shared.module';


@Component({
  selector: 'app-home',
  standalone: true,
  imports: [MapComponent, SharedModule],
  templateUrl: './home.html',
  styleUrl: './home.scss'
})
export class HomeComponent {
  pinLocations: HomePinLocationsDto[] = [];


  constructor(
    private homeService: HomeService
  ) { }


  ngOnInit(): void {
    this.loadPins();
  }

  private loadPins(): void {
    this.homeService.getRestaurantMaps().subscribe({
      next: (response: HomePinLocationsDto[]) => {
        this.pinLocations = response;
      },
      error: (error) => {
        this.pinLocations = [];
      }
    });
  }


}