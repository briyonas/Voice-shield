import type { GeoLocation } from "./types";

type Listener = (loc: GeoLocation) => void;

const HOME_KEY = "voiceshield_home";

export class LocationTracker {
  current: GeoLocation | null = null;
  homeLocation: { lat: number; lng: number } | null = null;
  private watchId: number | null = null;
  private trackingInterval: number | null = null;
  private listeners: Listener[] = [];

  constructor() {
    try {
      const saved = localStorage.getItem(HOME_KEY);
      if (saved) this.homeLocation = JSON.parse(saved);
    } catch {
      /* ignore */
    }
  }

  onUpdate(cb: Listener): () => void {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter((c) => c !== cb);
    };
  }

  setHomeLocation(lat: number, lng: number): void {
    this.homeLocation = { lat, lng };
    try {
      localStorage.setItem(HOME_KEY, JSON.stringify(this.homeLocation));
    } catch {
      /* ignore */
    }
  }

  async getCurrentPosition(): Promise<GeoLocation> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation not supported"));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc: GeoLocation = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            acc: pos.coords.accuracy,
            ts: pos.timestamp,
          };
          this.current = loc;
          resolve(loc);
        },
        (err) => reject(err),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
      );
    });
  }

  startWatching(): void {
    if (this.watchId !== null) return;
    if (!navigator.geolocation) return;
    this.watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const loc: GeoLocation = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          acc: pos.coords.accuracy,
          ts: pos.timestamp,
        };
        this.current = loc;
        for (const cb of this.listeners) cb(loc);
      },
      () => {
        /* swallow watch errors */
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 },
    );
  }

  stopWatching(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    if (this.trackingInterval !== null) {
      window.clearInterval(this.trackingInterval);
      this.trackingInterval = null;
    }
  }

  startSOSTracking(send: (loc: GeoLocation) => void, periodMs = 30000): void {
    this.trackingInterval = window.setInterval(async () => {
      try {
        const loc = await this.getCurrentPosition();
        send(loc);
      } catch {
        /* ignore */
      }
    }, periodMs);
  }

  stopSOSTracking(): void {
    if (this.trackingInterval !== null) {
      window.clearInterval(this.trackingInterval);
      this.trackingInterval = null;
    }
  }

  getAnomaly(): number {
    if (!this.homeLocation || !this.current) return 0;
    let anomaly = 0;
    const dist = this.haversine(
      this.homeLocation.lat,
      this.homeLocation.lng,
      this.current.lat,
      this.current.lng,
    );
    anomaly += Math.min((dist / 1000) * 0.05, 0.2);
    const hour = new Date().getHours();
    if (hour >= 22 || hour <= 5) anomaly += 0.15;
    return Math.min(anomaly, 0.35);
  }

  private haversine(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371000;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}

const locationTracker = new LocationTracker();
export default locationTracker;
