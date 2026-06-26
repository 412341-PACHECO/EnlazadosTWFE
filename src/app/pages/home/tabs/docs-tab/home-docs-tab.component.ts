import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { cloudUploadOutline, documentTextOutline } from 'ionicons/icons';

interface DocumentItem {
  title: string;
  meta: string;
  type: string;
  accent: 'blue' | 'green' | 'amber';
}

@Component({
  selector: 'app-home-docs-tab',
  standalone: true,
  imports: [CommonModule, IonIcon],
  templateUrl: './home-docs-tab.component.html',
  styleUrl: './home-docs-tab.component.scss',
})
export class HomeDocsTabComponent {
  protected readonly items: DocumentItem[] = [
    {
      title: 'Informe inicial · Lucas R.',
      meta: '12 Jun 2025 · 1.2 MB',
      type: 'Informe',
      accent: 'blue',
    },
    {
      title: 'Plan de intervención · Sofía M.',
      meta: '08 Jun 2025 · 840 KB',
      type: 'Plan',
      accent: 'green',
    },
    {
      title: 'Evaluación psicopedagógica',
      meta: '03 Jun 2025 · 2.1 MB',
      type: 'Evaluación',
      accent: 'amber',
    },
    {
      title: 'Acta de reunión de equipo',
      meta: '01 Jun 2025 · 320 KB',
      type: 'Acta',
      accent: 'blue',
    },
    {
      title: 'Derivación · Ana P.',
      meta: '28 May 2025 · 560 KB',
      type: 'Derivación',
      accent: 'green',
    },
  ];

  constructor() {
    addIcons({
      cloudUploadOutline,
      documentTextOutline,
    });
  }
}
