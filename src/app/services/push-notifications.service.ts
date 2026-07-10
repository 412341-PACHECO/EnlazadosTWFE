import { computed, inject, Injectable, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Router } from '@angular/router';
import {
  ActionPerformed,
  PushNotificationSchema,
  PushNotifications,
  Token,
} from '@capacitor/push-notifications';
import { catchError, map, of, switchMap, take } from 'rxjs';

import { AuthResponse, UserResponse } from '../models';
import { AuthSessionService } from './auth-session.service';
import { UserService } from './user.service';

export interface InAppNotificationItem {
  id: string;
  title: string;
  body: string;
  data: Record<string, string>;
  receivedAt: string;
  unread: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class PushNotificationsService {
  private readonly authSessionService = inject(AuthSessionService);
  private readonly userService = inject(UserService);
  private readonly router = inject(Router);
  private readonly syncedTokenStorageKey = 'push_token_sync_state';
  private readonly notificationsState = signal<InAppNotificationItem[]>([]);

  private listenersRegistered = false;
  private initializationStarted = false;

  readonly notifications = computed(() => this.notificationsState());
  readonly unreadCount = computed(
    () => this.notificationsState().filter((notification) => notification.unread).length,
  );

  initializeForAuthenticatedUser(): void {
    const session = this.authSessionService.getSession();

    this.loadStoredNotifications(session);

    if (!session || !Capacitor.isNativePlatform()) {
      return;
    }

    const platform = Capacitor.getPlatform();

    if (platform !== 'android' && platform !== 'ios') {
      return;
    }

    if (!this.listenersRegistered) {
      this.registerListeners();
      this.listenersRegistered = true;
    }

    if (this.initializationStarted) {
      return;
    }

    this.initializationStarted = true;

    PushNotifications.checkPermissions()
      .then((permissions) => {
        if (permissions.receive === 'granted') {
          return permissions;
        }

        return PushNotifications.requestPermissions();
      })
      .then((permissions) => {
        if (permissions.receive !== 'granted') {
          console.warn('[PUSH] Notification permission was not granted.');
          this.initializationStarted = false;
          return;
        }

        console.log('[PUSH] Registering device for push notifications.');
        return PushNotifications.register();
      })
      .catch((error: unknown) => {
        console.error('[PUSH] Failed to initialize push notifications.', error);
        this.initializationStarted = false;
      });
  }

  markAllAsRead(): void {
    this.notificationsState.set(
      this.notificationsState().map((notification) => ({
        ...notification,
        unread: false,
      })),
    );
    this.persistNotifications();
  }

  clearNotifications(): void {
    this.notificationsState.set([]);
    this.persistNotifications();
  }

  openNotification(notification: InAppNotificationItem): void {
    this.markAsRead(notification.id);
    this.handleNotificationNavigation(notification);
  }

  markAsRead(notificationId: string): void {
    this.notificationsState.set(
      this.notificationsState().map((notification) =>
        notification.id === notificationId ? { ...notification, unread: false } : notification,
      ),
    );
    this.persistNotifications();
  }

  private registerListeners(): void {
    void PushNotifications.addListener('registration', (token: Token) => {
      console.log('[PUSH] Registration token received.', token.value);
      this.persistToken(token.value);
    });

    void PushNotifications.addListener('registrationError', (error: unknown) => {
      console.error('[PUSH] Registration error.', error);
      this.initializationStarted = false;
    });

    void PushNotifications.addListener(
      'pushNotificationReceived',
      (notification: PushNotificationSchema) => {
        console.log('[PUSH] Notification received.', notification);
        this.storeIncomingNotification(notification, true);
      },
    );

    void PushNotifications.addListener(
      'pushNotificationActionPerformed',
      (action: ActionPerformed) => {
        console.log('[PUSH] Notification action performed.', action);
        const notification = this.storeIncomingNotification(action.notification, false);
        this.handleNotificationNavigation(notification);
      },
    );
  }

  private persistToken(token: string): void {
    const session = this.authSessionService.getSession();

    if (!session?.email || !token.trim()) {
      this.initializationStarted = false;
      return;
    }

    const syncKey = this.buildSyncKey(session, token);

    this.resolveSessionUserId(session)
      .pipe(
        take(1),
        switchMap((userId) => {
          if (!userId) {
            return of(null);
          }

          return this.userService.getUserById(userId).pipe(
            take(1),
            switchMap((user) => {
              const tokenAlreadyPersisted =
                localStorage.getItem(this.syncedTokenStorageKey) === syncKey &&
                user.fcmToken === token;

              if (tokenAlreadyPersisted) {
                console.log('[PUSH] Token already synced for current session and backend user.');
                return of(userId);
              }

              return this.userService.updateUser(userId, { fcmToken: token }).pipe(
                map(() => userId),
              );
            }),
            catchError((error: unknown) => {
              console.error('[PUSH] Failed to persist FCM token in backend.', error);
              return of(null);
            }),
          );
        }),
      )
      .subscribe((userId) => {
        if (userId) {
          localStorage.setItem(this.syncedTokenStorageKey, syncKey);
          console.log('[PUSH] FCM token persisted successfully for user.', userId);
        }

        this.initializationStarted = false;
      });
  }

  private resolveSessionUserId(session: AuthResponse) {
    const sessionUserId = session.userId ?? session.id;

    if (sessionUserId) {
      return of(sessionUserId);
    }

    return this.userService.getUserByEmail(session.email).pipe(
      take(1),
      map((user: UserResponse) => user.id),
      catchError((error: unknown) => {
        console.error('[PUSH] Failed to resolve current user id for token sync.', error);
        return of(null);
      }),
    );
  }

  private buildSyncKey(session: AuthResponse, token: string): string {
    const sessionUserId = session.userId ?? session.id ?? session.email;
    return `${sessionUserId}:${token}`;
  }

  private storeIncomingNotification(
    notification: PushNotificationSchema,
    unread: boolean,
  ): InAppNotificationItem {
    const normalizedNotification: InAppNotificationItem = {
      id: this.buildNotificationId(notification),
      title: notification.title?.trim() || 'Notificacion',
      body: notification.body?.trim() || 'Se recibio una nueva notificacion.',
      data: this.normalizeNotificationData(notification.data),
      receivedAt: new Date().toISOString(),
      unread,
    };

    const existingNotifications = this.notificationsState().filter(
      (item) => item.id !== normalizedNotification.id,
    );

    this.notificationsState.set([normalizedNotification, ...existingNotifications].slice(0, 25));
    this.persistNotifications();
    return normalizedNotification;
  }

  private buildNotificationId(notification: PushNotificationSchema): string {
    const fallbackId = `${notification.title ?? 'push'}-${notification.body ?? 'message'}-${Date.now()}`;
    return String(notification.id ?? notification.data?.['notificationId'] ?? notification.data?.['id'] ?? fallbackId);
  }

  private normalizeNotificationData(data: unknown): Record<string, string> {
    if (!data || typeof data !== 'object') {
      return {};
    }

    return Object.entries(data).reduce<Record<string, string>>((accumulator, [key, value]) => {
      accumulator[key] = typeof value === 'string' ? value : JSON.stringify(value);
      return accumulator;
    }, {});
  }

  private loadStoredNotifications(session: AuthResponse | null): void {
    if (!session) {
      this.notificationsState.set([]);
      return;
    }

    const storageKey = this.getNotificationsStorageKey(session);
    const storedNotifications = localStorage.getItem(storageKey);

    if (!storedNotifications) {
      this.notificationsState.set([]);
      return;
    }

    try {
      const parsedNotifications = JSON.parse(storedNotifications) as InAppNotificationItem[];
      this.notificationsState.set(Array.isArray(parsedNotifications) ? parsedNotifications : []);
    } catch {
      this.notificationsState.set([]);
      localStorage.removeItem(storageKey);
    }
  }

  private persistNotifications(): void {
    const session = this.authSessionService.getSession();

    if (!session) {
      return;
    }

    localStorage.setItem(
      this.getNotificationsStorageKey(session),
      JSON.stringify(this.notificationsState()),
    );
  }

  private getNotificationsStorageKey(session: AuthResponse): string {
    const sessionUserId = session.userId ?? session.id ?? session.email;
    return `push_notifications:${sessionUserId}`;
  }

  private handleNotificationNavigation(notification: InAppNotificationItem): void {
    if (this.isContactRequestNotification(notification)) {
      void this.router.navigate(['/home'], {
        queryParams: { tab: 'requests' },
      });
      return;
    }

    if (!this.isHighPriorityReportNotification(notification)) {
      return;
    }

    void this.router.navigate(['/home'], {
      queryParams: { tab: 'record' },
    });
  }

  private isHighPriorityReportNotification(notification: InAppNotificationItem): boolean {
    const type = (notification.data['type'] ?? notification.data['category'] ?? '').toLowerCase();
    const priority = (
      notification.data['priority'] ??
      notification.data['reportPriority'] ??
      notification.data['dailyReportPriority'] ??
      ''
    ).toUpperCase();
    const title = notification.title.toLowerCase();
    const body = notification.body.toLowerCase();

    const isReportType =
      type.includes('report') ||
      type.includes('reporte') ||
      title.includes('report') ||
      title.includes('reporte') ||
      body.includes('report') ||
      body.includes('reporte');

    return isReportType && priority === 'HIGH';
  }

  private isContactRequestNotification(notification: InAppNotificationItem): boolean {
    const type = (notification.data['type'] ?? notification.data['category'] ?? '').toLowerCase();

    return (
      type.includes('contact_request') ||
      type.includes('contact-request') ||
      type.includes('solicitud_contacto') ||
      type.includes('solicitud-contacto') ||
      type.includes('contacto')
    );
  }
}
