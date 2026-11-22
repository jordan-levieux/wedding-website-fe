import { HttpClient } from "@angular/common/http";
import { inject, Service } from "@angular/core";
import { firstValueFrom, map } from "rxjs";
import { environment } from "../../environments/environment";
import { albumPhotos, GalleryResponse } from "../gallery-page/gallery";
import { loader } from "./loader";

// the API's signed links last at least six hours, so fetch new ones before then
const FRESH_FOR_MS = 5 * 60 * 60 * 1000;

@Service()
export class GalleryService {
  private http = inject(HttpClient);
  private loadedAt = 0;

  // photos by album id
  public photos = loader(() =>
    firstValueFrom(
      this.http.get<GalleryResponse>(`${environment.apiUrl}/gallery`).pipe(
        map((response) => {
          this.loadedAt = Date.now();
          return albumPhotos(response);
        }),
      ),
    ),
  );

  public load() {
    if (!this.photos.hasValue() || Date.now() - this.loadedAt > FRESH_FOR_MS) {
      void this.photos.reload();
    }
  }
}
