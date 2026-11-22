import { DOCUMENT, NgOptimizedImage } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  OnDestroy,
  signal,
  viewChild,
} from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { Router, RouterLink } from "@angular/router";
import { GalleryService } from "../services/galleryService";
import { Album, ALBUMS, Photo } from "./gallery";

const SWIPE_DISTANCE = 50;

const ALBUM_ICONS: Record<string, string> = {
  "forest-floor": "forest",
  us: "favorite",
};

@Component({
  selector: "app-gallery-page",
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: "./gallery-page.scss",
  templateUrl: "./gallery-page.html",
  imports: [MatButtonModule, MatIconModule, NgOptimizedImage, RouterLink],
})
export class GalleryPage implements OnDestroy {
  // query param, so a link can open a particular album
  album = input<string>();

  private document = inject(DOCUMENT);
  private router = inject(Router);
  private gallery = inject(GalleryService);
  private viewer = viewChild.required<ElementRef<HTMLDialogElement>>("viewer");
  private swipeStartX: number | null = null;

  protected readonly albums = ALBUMS;
  protected readonly albumIcons = ALBUM_ICONS;
  protected loading = computed(
    () => !this.gallery.photos.hasValue() && !this.gallery.photos.error(),
  );
  protected failed = computed(() => !!this.gallery.photos.error());
  protected selected = computed(
    () => this.albums.find((album) => album.id === this.album()) ?? this.albums[0]!,
  );
  protected selectedPhotos = computed(() => this.photosOf(this.selected()));
  protected viewing = signal<number | null>(null);
  protected shown = computed(() => {
    const index = this.viewing();
    const photos = this.selectedPhotos();
    if (index === null || !photos[index]) {
      return null;
    }
    return { photo: photos[index], position: index + 1, count: photos.length };
  });

  constructor() {
    this.gallery.load();
  }

  protected photosOf(album: Album): Photo[] {
    return this.gallery.photos.value()?.[album.id] ?? [];
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
    this.viewing.set(index);
    // a modal dialog doesn't stop the page behind it from scrolling
    this.document.documentElement.style.overflow = "hidden";
    this.viewer().nativeElement.showModal();
  }

  protected close() {
    this.viewer().nativeElement.close();
  }

  protected onClosed() {
    this.viewing.set(null);
    this.document.documentElement.style.overflow = "";
  }

  protected step(by: number) {
    const count = this.selectedPhotos().length;
    this.viewing.update((index) => (index === null ? index : (index + by + count) % count));
  }

  protected onKeydown(event: KeyboardEvent) {
    if (event.key === "ArrowLeft") {
      this.step(-1);
    } else if (event.key === "ArrowRight") {
      this.step(1);
    }
  }

  // a click on the dark area around the photo lands on the dialog itself
  protected onClick(event: MouseEvent) {
    if (event.target === this.viewer().nativeElement) {
      this.close();
    }
  }

  protected onPointerDown(event: PointerEvent) {
    this.swipeStartX = event.clientX;
  }

  protected onPointerUp(event: PointerEvent) {
    if (this.swipeStartX === null) {
      return;
    }
    const distance = event.clientX - this.swipeStartX;
    this.swipeStartX = null;
    if (Math.abs(distance) >= SWIPE_DISTANCE) {
      this.step(distance < 0 ? 1 : -1);
    }
  }

  ngOnDestroy() {
    this.document.documentElement.style.overflow = "";
  }
}
