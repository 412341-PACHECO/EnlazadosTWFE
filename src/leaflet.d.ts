declare module 'leaflet' {
  export type LatLngExpression = [number, number];

  export interface LatLng {
    lat: number;
    lng: number;
  }

  export interface MapOptions {
    center: LatLngExpression;
    zoom: number;
    zoomControl?: boolean;
  }

  export interface PanOptions {
    animate?: boolean;
  }

  export interface TileLayerOptions {
    attribution?: string;
  }

  export interface MarkerOptions {
    draggable?: boolean;
  }

  export interface LeafletMouseEvent {
    latlng: LatLng;
  }

  export class Map {
    constructor(element: HTMLElement, options?: MapOptions);
    on(event: string, handler: (event: LeafletMouseEvent) => void): this;
    panTo(latlng: LatLngExpression, options?: PanOptions): this;
    invalidateSize(): this;
    remove(): void;
  }

  export class Marker {
    addTo(map: Map): this;
    on(event: string, handler: () => void): this;
    getLatLng(): LatLng;
    setLatLng(latlng: LatLngExpression): this;
  }

  export function map(element: HTMLElement, options?: MapOptions): Map;
  export function tileLayer(urlTemplate: string, options?: TileLayerOptions): { addTo(map: Map): void };
  export function marker(latlng: LatLngExpression, options?: MarkerOptions): Marker;
}
