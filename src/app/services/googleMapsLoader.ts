import { Service } from "@angular/core";
import { environment } from "../../environments/environment";

const CALLBACK = "__weddingGoogleMapsLoaded";

// Loads the Maps JavaScript API bootstrap once; libraries are then pulled in with google.maps.importLibrary.
@Service()
export class GoogleMapsLoader {
  public readonly available = !!environment.googleMapsApiKey;
  private loading: Promise<void> | null = null;

  load(): Promise<void> {
    if (!this.available) {
      return Promise.reject(new Error("no Google Maps API key configured"));
    }
    this.loading ??= new Promise<void>((resolve, reject) => {
      (window as unknown as Record<string, () => void>)[CALLBACK] = () => resolve();
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?${new URLSearchParams({
        key: environment.googleMapsApiKey,
        v: "weekly",
        loading: "async",
        callback: CALLBACK,
      })}`;
      script.async = true;
      script.addEventListener("error", (error) => {
        this.loading = null;
        script.remove();
        reject(error);
      });
      document.head.appendChild(script);
    });
    return this.loading;
  }
}
