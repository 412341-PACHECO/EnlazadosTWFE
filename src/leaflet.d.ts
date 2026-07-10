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

  export interface DivIconOptions {
    className?: string;
    html?: string;
    iconSize?: [number, number];
    iconAnchor?: [number, number];
    popupAnchor?: [number, number];
  }

  export interface CircleOptions {
    radius: number;
    color?: string;
    fillColor?: string;
    fillOpacity?: number;
    weight?: number;
    dashArray?: string;
  }

  export class DivIcon {}

  export interface MarkerOptions {
    draggable?: boolean;
    icon?: DivIcon;
  }

  export interface LeafletMouseEvent {
    latlng: LatLng;
  }

  export class LayerGroup {
    addTo(map: Map): this;
    clearLayers(): this;
  }

  export class Map {
    constructor(element: HTMLElement, options?: MapOptions);
    on(event: string, handler: (event: LeafletMouseEvent) => void): this;
    panTo(latlng: LatLngExpression, options?: PanOptions): this;
    hasLayer(layer: Circle | Marker | LayerGroup): boolean;
    invalidateSize(): this;
    remove(): void;
  }

  export class Marker {
    addTo(target: Map | LayerGroup): this;
    on(event: string, handler: () => void): this;
    getLatLng(): LatLng;
    setLatLng(latlng: LatLngExpression): this;
    bindPopup(content: string): this;
    openPopup(): this;
  }

  export class Circle {
    addTo(target: Map | LayerGroup): this;
    setLatLng(latlng: LatLngExpression): this;
    setRadius(radius: number): this;
    remove(): this;
  }

  export function map(element: HTMLElement, options?: MapOptions): Map;
  export function tileLayer(urlTemplate: string, options?: TileLayerOptions): { addTo(map: Map): void };
  export function layerGroup(): LayerGroup;
  export function marker(latlng: LatLngExpression, options?: MarkerOptions): Marker;
  export function circle(latlng: LatLngExpression, options?: CircleOptions): Circle;
  export function divIcon(options?: DivIconOptions): DivIcon;
}
