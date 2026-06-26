import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chevronForwardOutline, locationOutline } from 'ionicons/icons';

interface LocationItem {
  name: string;
  address: string;
  type: string;
  accent: 'blue' | 'green' | 'amber';
}

@Component({
  selector: 'app-home-map-tab',
  standalone: true,
  imports: [CommonModule, IonIcon],
  templateUrl: './home-map-tab.component.html',
  styleUrl: './home-map-tab.component.scss',
})
export class HomeMapTabComponent {
  protected readonly locations: LocationItem[] = [
    {
      name: 'Centro Terapéutico Enlazados',
      address: 'Av. Fontana 342, Trelew',
      type: 'Centro principal',
      accent: 'blue',
    },
    {
      name: 'Escuela Especial N°507',
      address: 'Rivadavia 128, Trelew',
      type: 'Escuela integración',
      accent: 'green',
    },
    {
      name: 'Domicilio · Lucas R.',
      address: 'Belgrano 891, Trelew',
      type: 'Visita domiciliaria',
      accent: 'amber',
    },
  ];

  constructor() {
    addIcons({
      chevronForwardOutline,
      locationOutline,
    });
  }
}
