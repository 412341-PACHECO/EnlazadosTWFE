import { Component } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';

import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent {
  constructor() {
    console.log(
      '[APP INIT]',
      'platform=',
      Capacitor.getPlatform(),
      'apiBaseUrl=',
      environment.apiBaseUrl,
      'origin=',
      typeof window !== 'undefined' ? window.location.origin : 'server',
    );
  }
}
