import { NgOptimizedImage } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  signal,
  viewChildren,
} from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { Router, RouterLink } from "@angular/router";
import { GalleryService } from "../services/galleryService";
import { Album, ALBUMS, Photo } from "./gallery";
import { PhotoViewer } from "./photo-viewer";

// enough shimmering tiles to fill a phone screen while the album loads
const PLACEHOLDER_TILES = 6;

const ALBUM_ICONS: Record<string, string> = {
  "forest-floor": "forest",
  us: "favorite",
};

@Component({
  selector: "app-gallery-page",
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ["./gallery-page.scss", "./photo-viewer.scss"],
  templateUrl: "./gallery-page.html",
  imports: [MatButtonModule, MatIconModule, NgOptimizedImage, RouterLink],
  providers: [PhotoViewer],
})
export class GalleryPage {
  // query param, so a link can open a particular album
  album = input<string>();

  private router = inject(Router);
  private gallery = inject(GalleryService);
  private viewer = inject(PhotoViewer);
  private thumbs = viewChildren<ElementRef<HTMLImageElement>>("thumb");

  protected readonly albums = ALBUMS;
  protected readonly albumIcons = ALBUM_ICONS;
  protected readonly placeholderTiles = [...Array(PLACEHOLDER_TILES).keys()];
  // thumbnails that have loaded (or failed to), so their tiles stop shimmering
  protected settledThumbs = signal<ReadonlySet<string>>(new Set());
  protected loading = computed(
    () => !this.gallery.photos.hasValue() && !this.gallery.photos.error(),
  );
  protected failed = computed(() => !!this.gallery.photos.error());
  protected selected = computed(
    () => this.albums.find((album) => album.id === this.album()) ?? this.albums[0]!,
  );
  protected selectedPhotos = computed(() => this.photosOf(this.selected()));
  constructor() {
    this.gallery.load();
  }

  protected photosOf(album: Album): Photo[] {
    return this.gallery.photos.value()?.[album.id] ?? [];
  }

  protected thumbSettled(thumb: string) {
    this.settledThumbs.update((settled) => new Set(settled).add(thumb));
  }

  protected coverLoading(album: Album) {
    const cover = this.photosOf(album)[0];
    return this.loading() || (!!cover && !this.settledThumbs().has(cover.thumb));
  }

  protected retry() {
    void this.gallery.photos.reload();
  }

  protected select(album: Album) {
    // replaces rather than adds to the history, so back still leaves the gallery
    void this.router.navigate([], {
      queryParams: { album: album === this.albums[0] ? null : album.id },
      replaceUrl: true,
    });
  }

  protected photoCount(album: Album) {
    if (this.loading() || this.failed()) {
      return "";
    }
    const count = this.photosOf(album).length;
    return count ? `${count} ${count === 1 ? "photo" : "photos"}` : "Coming soon";
  }

  protected open(index: number) {
    void this.viewer.open(
      this.selectedPhotos(),
      index,
      this.thumbs().map((thumb) => thumb.nativeElement),
    );
  }
}
