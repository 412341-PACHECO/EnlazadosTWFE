import { CommonModule } from '@angular/common';
import { Component, ViewChild, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  calendarOutline,
  documentTextOutline,
  folderOpenOutline,
  heart,
  locationOutline,
  notificationsOutline,
  personOutline,
} from 'ionicons/icons';

import { AuthResponse } from '../../models';
import { AuthService } from '../../services/auth.service';
import { HomeDocsTabComponent } from './tabs/docs-tab/home-docs-tab.component';
import { HomeMapTabComponent } from './tabs/map-tab/home-map-tab.component';
import { HomeProfileTabComponent } from './tabs/profile-tab/home-profile-tab.component';
import { HomeRecordTabComponent } from './tabs/record-tab/home-record-tab.component';

type HomeTab = 'profile' | 'map' | 'record' | 'docs';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    IonIcon,
    HomeProfileTabComponent,
    HomeMapTabComponent,
    HomeRecordTabComponent,
    HomeDocsTabComponent,
  ],
})
export class HomePage {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  @ViewChild(HomeRecordTabComponent)
  private recordTabComponent?: HomeRecordTabComponent;

  protected readonly todayLabel = new Intl.DateTimeFormat('es-AR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date());

  protected readonly session: AuthResponse | null = this.authService.getSession();
  protected readonly notificationsCount = 3;
  protected activeTab: HomeTab = 'profile';

  constructor() {
    addIcons({
      calendarOutline,
      documentTextOutline,
      folderOpenOutline,
      heart,
      locationOutline,
      notificationsOutline,
      personOutline,
    });

    if (!this.session) {
      void this.router.navigate(['/login']);
    }
  }

  protected get displayName(): string {
    if (!this.session) {
      return 'Profesional';
    }

    const fullName = `${this.session.firstName ?? ''} ${this.session.lastName ?? ''}`.trim();
    return fullName || this.session.email;
  }

  protected setActiveTab(tab: HomeTab): void {
    if (tab === 'record' && this.activeTab === 'record') {
      this.recordTabComponent?.resetToOverview();
      return;
    }

    this.activeTab = tab;
  }

  protected logout(): void {
    this.authService.logout();
    void this.router.navigate(['/login']);
  }
}
