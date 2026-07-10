import { CommonModule } from '@angular/common';
import { Component, DestroyRef, HostListener, OnInit, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  calendarOutline,
  checkmarkDoneOutline,
  closeOutline,
  documentTextOutline,
  folderOpenOutline,
  heart,
  locationOutline,
  notificationsOutline,
  personOutline,
} from 'ionicons/icons';

import { AuthResponse } from '../../models';
import { AuthService } from '../../services/auth.service';
import {
  InAppNotificationItem,
  PushNotificationsService,
} from '../../services/push-notifications.service';
import { HomeDocsTabComponent } from './tabs/docs-tab/home-docs-tab.component';
import { HomeMapTabComponent } from './tabs/map-tab/home-map-tab.component';
import { HomeProfileTabComponent } from './tabs/profile-tab/home-profile-tab.component';
import { HomeRequestsTabComponent } from './tabs/requests-tab/home-requests-tab.component';
import { HomeRecordTabComponent } from './tabs/record-tab/home-record-tab.component';

type HomeTab = 'profile' | 'map' | 'record' | 'docs' | 'requests';

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
    HomeRequestsTabComponent,
    HomeMapTabComponent,
    HomeRecordTabComponent,
    HomeDocsTabComponent,
  ],
})
export class HomePage implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly pushNotificationsService = inject(PushNotificationsService);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild(HomeRecordTabComponent)
  private recordTabComponent?: HomeRecordTabComponent;

  protected readonly todayLabel = new Intl.DateTimeFormat('es-AR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date());

  protected readonly session: AuthResponse | null = this.authService.getSession();
  protected activeTab: HomeTab = 'profile';
  protected profileDisplayNameOverride: string | null = null;
  protected isNotificationsPanelOpen = false;

  constructor() {
    addIcons({
      calendarOutline,
      checkmarkDoneOutline,
      closeOutline,
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

  ngOnInit(): void {
    if (!this.session) {
      return;
    }

    this.pushNotificationsService.initializeForAuthenticatedUser();
    this.activatedRoute.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const requestedTab = params.get('tab');

        if (requestedTab === 'record') {
          this.activeTab = 'record';
          return;
        }

        if (requestedTab === 'map') {
          this.activeTab = 'map';
          return;
        }

        if (requestedTab === 'docs') {
          this.activeTab = 'docs';
          return;
        }

        if (requestedTab === 'requests' && this.isProfessionalRole) {
          this.activeTab = 'requests';
          return;
        }

        if (requestedTab === 'profile') {
          this.activeTab = 'profile';
        }
      });
  }

  protected get displayName(): string {
    if (this.profileDisplayNameOverride?.trim()) {
      return this.profileDisplayNameOverride;
    }

    if (!this.session) {
      return 'Profesional';
    }

    const fullName = `${this.session.firstName ?? ''} ${this.session.lastName ?? ''}`.trim();
    return fullName || this.session.email;
  }

  protected get notificationsCount(): number {
    return this.pushNotificationsService.unreadCount();
  }

  protected get notifications(): InAppNotificationItem[] {
    return this.pushNotificationsService.notifications();
  }

  protected get isProfessionalRole(): boolean {
    return this.session?.role === 'PROFESSIONAL';
  }

  protected setActiveTab(tab: HomeTab): void {
    if (tab === 'record' && this.activeTab === 'record') {
      this.recordTabComponent?.resetToOverview();
      return;
    }

    this.activeTab = tab;
  }

  protected onProfileDisplayNameResolved(displayName: string): void {
    this.profileDisplayNameOverride = displayName.trim() || null;
  }

  protected toggleNotificationsPanel(): void {
    this.isNotificationsPanelOpen = !this.isNotificationsPanelOpen;
  }

  protected closeNotificationsPanel(): void {
    this.isNotificationsPanelOpen = false;
  }

  protected markNotificationsAsRead(): void {
    this.pushNotificationsService.markAllAsRead();
  }

  protected clearNotifications(): void {
    this.pushNotificationsService.clearNotifications();
  }

  protected openNotification(notification: InAppNotificationItem): void {
    this.pushNotificationsService.openNotification(notification);
    this.isNotificationsPanelOpen = false;
  }

  protected getNotificationTimestamp(value: string): string {
    const timestamp = new Date(value);
    return new Intl.DateTimeFormat('es-AR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(timestamp);
  }

  protected logout(): void {
    this.authService.logout();
    void this.router.navigate(['/login']);
  }

  @HostListener('document:keydown.escape')
  protected onEscapePressed(): void {
    this.closeNotificationsPanel();
  }
}
