import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chevronDownOutline, closeOutline, helpCircleOutline } from 'ionicons/icons';

type FaqTab = 'profile' | 'map' | 'record' | 'docs' | 'requests';
type FaqRole = 'PARENT' | 'PROFESSIONAL' | null;

type FaqItem = {
  id: string;
  question: string;
  answer: string;
};

@Component({
  selector: 'app-faq-modal',
  standalone: true,
  imports: [CommonModule, IonIcon],
  templateUrl: './faq-modal.component.html',
  styleUrl: './faq-modal.component.scss',
})
export class FaqModalComponent implements OnChanges {
  @Input({ required: true }) activeTab: FaqTab = 'profile';
  @Input() role: FaqRole = null;

  @Output() closeRequested = new EventEmitter<void>();

  protected expandedItemId: string | null = null;

  private readonly baseFaqs: Record<FaqTab, FaqItem[]> = {
    profile: [
      {
        id: 'profile-identity',
        question: '¿Qué información aparece en Mi Perfil?',
        answer:
          'Esta pestaña resume tu identidad dentro de EnlazadosTW: nombre, rol, correo, estado de cuenta y datos principales del perfil asociado.',
      },
      {
        id: 'profile-verified',
        question: '¿Qué significa que la cuenta esté verificada?',
        answer:
          'Significa que el correo fue confirmado correctamente. Ese estado se usa para validar el acceso y habilitar los flujos principales de la aplicación.',
      },
      {
        id: 'profile-status',
        question: '¿Qué significan los estados de la tarjeta principal?',
        answer:
          'Los indicadores de la tarjeta resumen muestran datos rápidos de tu cuenta, como cantidad de pacientes asociados o si la cuenta está activa y verificada.',
      },
    ],
    map: [
      {
        id: 'map-search',
        question: '¿Cómo busco profesionales o instituciones?',
        answer:
          'Usá los filtros de especialidad y obra social, y activá o desactivá las capas del mapa para ver profesionales, escuelas y consultorios.',
      },
      {
        id: 'map-query-point',
        question: '¿Qué pasa cuando toco el mapa?',
        answer:
          'La aplicación mueve el punto de consulta y vuelve a calcular qué profesionales e instituciones quedan cerca de esa ubicación.',
      },
      {
        id: 'map-contact-request',
        question: '¿Cómo funciona Solicitar servicios?',
        answer:
          'Cuando una familia encuentra un profesional puede enviar una solicitud de contacto. Esa solicitud le llega al profesional como notificación push y también aparece en la pestaña Solicitudes.',
      },
    ],
    record: [
      {
        id: 'record-overview',
        question: '¿Qué muestra el Legajo interdisciplinario?',
        answer:
          'Muestra los pacientes vinculados, el equipo terapéutico activo, los reportes diarios, los resúmenes semanales generados con IA y el estado general de seguimiento.',
      },
      {
        id: 'record-team',
        question: '¿Cómo se crea el equipo terapéutico?',
        answer:
          'La familia invita profesionales por correo. Cuando aceptan la invitación, quedan incorporados al equipo activo del paciente y ya pueden participar del legajo.',
      },
      {
        id: 'record-reports',
        question: '¿Qué diferencia hay entre reportes diarios y resúmenes semanales?',
        answer:
          'Los reportes diarios los cargan los profesionales sesión por sesión. Los resúmenes semanales condensan esos reportes y se generan automáticamente los viernes a las 18.',
      },
    ],
    docs: [
      {
        id: 'docs-attendance',
        question: '¿Para qué sirve Registrar asistencia?',
        answer:
          'Permite cargar cada sesión facturable con paciente, fecha, honorario, obra social, cobertura, copago y notas administrativas.',
      },
      {
        id: 'docs-billing',
        question: '¿Cómo se genera una liquidación?',
        answer:
          'Primero se registran asistencias pendientes. Luego se elige el período y, si hace falta, filtros por paciente u obra social. La app consolida esas sesiones en una liquidación.',
      },
      {
        id: 'docs-status',
        question: '¿Qué significan los estados de facturación?',
        answer:
          'Pendiente indica que la liquidación todavía no fue cobrada. Cuando se cobra, podés marcarla como pagada para que pase a liquidada y quede reflejada en el dashboard.',
      },
    ],
    requests: [
      {
        id: 'requests-meaning',
        question: '¿Qué son las solicitudes?',
        answer:
          'Son pedidos de contacto enviados desde el mapa entre familias y profesionales para iniciar una conversación fuera de la aplicación.',
      },
      {
        id: 'requests-status',
        question: '¿Qué significa Pendiente o Vista?',
        answer:
          'Pendiente significa que la solicitud fue enviada pero todavía no fue abierta por el profesional. Vista indica que el profesional ya ingresó a la pestaña y la solicitud fue marcada como leída.',
      },
      {
        id: 'requests-contact',
        question: '¿Cómo se contactan después?',
        answer:
          'La app muestra los datos compartidos en la solicitud, como correo y teléfono, para que ambas partes continúen la coordinación por fuera del sistema.',
      },
    ],
  };

  constructor() {
    addIcons({
      chevronDownOutline,
      closeOutline,
      helpCircleOutline,
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['activeTab'] || changes['role']) {
      this.expandedItemId = this.items[0]?.id ?? null;
    }
  }

  protected get title(): string {
    const titles: Record<FaqTab, string> = {
      profile: 'Ayuda de perfil',
      map: 'Ayuda del mapa',
      record: 'Ayuda del legajo',
      docs: 'Ayuda de facturación',
      requests: 'Ayuda de solicitudes',
    };

    return titles[this.activeTab];
  }

  protected get description(): string {
    const roleLabel =
      this.role === 'PROFESSIONAL' ? 'profesional' : this.role === 'PARENT' ? 'familia' : 'usuario';

    const descriptions: Record<FaqTab, string> = {
      profile: `Resumen de tu cuenta y de los datos principales asociados a tu rol de ${roleLabel}.`,
      map: 'Cómo explorar el mapa, aplicar filtros y enviar solicitudes de contacto.',
      record: 'Cómo interpretar el seguimiento del paciente, el equipo terapéutico y los reportes.',
      docs: 'Cómo registrar sesiones, generar liquidaciones y seguir el estado de cobro.',
      requests: 'Cómo entender el estado de las solicitudes de contacto y sus datos asociados.',
    };

    return descriptions[this.activeTab];
  }

  protected get items(): FaqItem[] {
    const items = [...this.baseFaqs[this.activeTab]];

    if (this.activeTab === 'map' && this.role === 'PROFESSIONAL') {
      items[2] = {
        id: 'map-contact-request-pro',
        question: '¿Qué pasa cuando una familia solicita mis servicios?',
        answer:
          'Te llega una notificación push y además la solicitud queda registrada en la pestaña Solicitudes para que puedas revisar el mensaje y los datos compartidos.',
      };
    }

    if (this.activeTab === 'record' && this.role === 'PARENT') {
      items.push({
        id: 'record-parent-actions',
        question: '¿Qué puede hacer la familia dentro del legajo?',
        answer:
          'Puede ver el equipo activo, revisar reportes y resúmenes semanales, y gestionar invitaciones para sumar nuevos profesionales al seguimiento del paciente.',
      });
    }

    if (this.activeTab === 'record' && this.role === 'PROFESSIONAL') {
      items.push({
        id: 'record-professional-actions',
        question: '¿Qué puede hacer un profesional dentro del legajo?',
        answer:
          'Puede revisar al equipo terapéutico, consultar el historial de reportes y cargar nuevos reportes diarios cuando forma parte activa del equipo del paciente.',
      });
    }

    if (this.activeTab === 'docs' && this.role !== 'PROFESSIONAL') {
      return [
        {
          id: 'docs-locked',
          question: '¿Por qué no tengo acceso a esta pestaña?',
          answer:
            'La sección de facturación está pensada para perfiles profesionales, porque allí se registran asistencias, liquidaciones y reportes administrativos de cobro.',
        },
      ];
    }

    return items;
  }

  protected toggleItem(itemId: string): void {
    this.expandedItemId = this.expandedItemId === itemId ? null : itemId;
  }

  protected isItemExpanded(itemId: string): boolean {
    return this.expandedItemId === itemId;
  }

  protected close(): void {
    this.closeRequested.emit();
  }
}
