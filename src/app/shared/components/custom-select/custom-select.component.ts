import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  HostListener,
  Input,
  ViewChild,
  forwardRef,
  inject,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface CustomSelectOption<T = string> {
  label: string;
  value: T;
}

@Component({
  selector: 'app-custom-select',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './custom-select.component.html',
  styleUrl: './custom-select.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CustomSelectComponent),
      multi: true,
    },
  ],
})
export class CustomSelectComponent<T = string> implements ControlValueAccessor {
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  @ViewChild('searchInput') private searchInput?: ElementRef<HTMLInputElement>;

  @Input() options: CustomSelectOption<T>[] = [];
  @Input() placeholder = 'Seleccionar';
  @Input() theme: 'blue' | 'green' = 'blue';
  @Input() disabled = false;
  @Input() searchable = false;
  @Input() searchPlaceholder = 'Buscar...';

  protected isOpen = false;
  protected value: T | null = null;
  protected searchTerm = '';

  private onChange: (value: T | null) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  protected get selectedLabel(): string {
    const selectedOption = this.options.find((option) => option.value === this.value);
    return selectedOption?.label ?? this.placeholder;
  }

  protected get hasValue(): boolean {
    return this.options.some((option) => option.value === this.value);
  }

  protected get filteredOptions(): CustomSelectOption<T>[] {
    const normalizedQuery = this.searchTerm.trim().toLowerCase();

    if (!normalizedQuery) {
      return this.options;
    }

    return this.options.filter((option) => option.label.toLowerCase().includes(normalizedQuery));
  }

  writeValue(value: T | null): void {
    this.value = value;
  }

  registerOnChange(fn: (value: T | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  protected toggleDropdown(): void {
    if (this.disabled) {
      return;
    }

    this.isOpen = !this.isOpen;

    if (this.isOpen) {
      this.focusSearchIfNeeded();
    } else {
      this.searchTerm = '';
    }

    this.onTouched();
  }

  protected selectOption(option: CustomSelectOption<T>): void {
    this.value = option.value;
    this.isOpen = false;
    this.searchTerm = '';
    this.onChange(option.value);
    this.onTouched();
  }

  protected isSelected(option: CustomSelectOption<T>): boolean {
    return option.value === this.value;
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (!this.isOpen) {
      return;
    }

    const target = event.target;

    if (!(target instanceof Node)) {
      return;
    }

    if (!this.elementRef.nativeElement.contains(target)) {
      this.isOpen = false;
      this.searchTerm = '';
      this.onTouched();
    }
  }

  protected onSearchInput(event: Event): void {
    const target = event.target;

    if (!(target instanceof HTMLInputElement)) {
      return;
    }

    this.searchTerm = target.value;
  }

  private focusSearchIfNeeded(): void {
    if (!this.searchable) {
      return;
    }

    queueMicrotask(() => this.searchInput?.nativeElement.focus());
  }
}
