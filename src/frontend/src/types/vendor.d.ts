// Ambient declarations for CDN-loaded libraries
declare const maplibregl: {
  Map: new (options: {
    container: HTMLElement;
    style: string;
    center?: [number, number];
    zoom?: number;
    attributionControl?: boolean;
  }) => MaplibreMap;
  Marker: new (options?: {
    element?: HTMLElement;
    draggable?: boolean;
  }) => MaplibreMarker;
  AttributionControl: new (options?: { compact?: boolean }) => object;
  NavigationControl: new (options?: { showCompass?: boolean }) => object;
  GeoJSONSource: new (options: object) => GeoJSONSourceInstance;
};

interface MaplibreMap {
  addControl(control: object, position?: string): void;
  on(event: string, handler: (e?: any) => void): void;
  once(event: string, handler: (e?: any) => void): void;
  remove(): void;
  resize(): void;
  getCanvas(): HTMLCanvasElement;
  getSource(id: string): GeoJSONSourceInstance | undefined;
  getLayer(id: string): object | undefined;
  addSource(id: string, options: object): void;
  addLayer(layer: object): void;
  removeSource(id: string): void;
  removeLayer(id: string): void;
  isStyleLoaded(): boolean;
  setStyle(style: string): void;
  fitBounds(
    bounds: [[number, number], [number, number]],
    options?: object,
  ): void;
  dragPan: { enable(): void; disable(): void };
  project(lngLat: [number, number]): { x: number; y: number };
  setPaintProperty(layerId: string, name: string, value: any): void;
}

interface GeoJSONSourceInstance {
  setData(data: object): void;
}

interface MaplibreMarker {
  setLngLat(lngLat: [number, number]): this;
  addTo(map: MaplibreMap): this;
  remove(): void;
  getLngLat(): { lat: number; lng: number };
  on(event: string, handler: () => void): void;
}

declare const turf: {
  lineString(coords: [number, number][], properties?: object): GeoJSONFeature;
  featureCollection(features: GeoJSONFeature[]): GeoJSONFeatureCollection;
  transformRotate(
    geojson: GeoJSONFeatureCollection,
    angle: number,
    options?: { pivot?: [number, number] },
  ): GeoJSONFeatureCollection;
  transformScale(
    geojson: GeoJSONFeatureCollection,
    factor: number,
    options?: { origin?: [number, number] },
  ): GeoJSONFeatureCollection;
  bbox(geojson: GeoJSONFeatureCollection): [number, number, number, number];
};

interface GeoJSONFeatureCollection {
  type: "FeatureCollection";
  features: GeoJSONFeature[];
}

interface GeoJSONFeature {
  type: "Feature";
  geometry: GeoJSONGeometry | null;
  properties: object | null;
}

interface GeoJSONGeometry {
  type: string;
  coordinates: any;
}
