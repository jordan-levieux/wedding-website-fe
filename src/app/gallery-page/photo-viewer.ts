import { DestroyRef, inject, Injectable } from "@angular/core";
import type PhotoSwipe from "photoswipe";
import type { SlideData } from "photoswipe";
import { Photo } from "./gallery";

// scripts/prepare-gallery-photos.sh makes the full-screen copies this size on the long side
const DISPLAY_SIZE = 2560;

/**
 * PhotoSwipe needs a photo's size before it loads. One uploaded without its size gets a guess from
 * its thumbnail's shape (3:2 if the thumbnail hasn't loaded yet), corrected once the photo arrives.
 */
export const slideFor = (photo: Photo, thumb?: HTMLImageElement): SlideData => {
  let { width, height } = photo;
  if (!width || !height) {
    const ratio = thumb?.naturalWidth ? thumb.naturalWidth / thumb.naturalHeight : 3 / 2;
    width = ratio >= 1 ? DISPLAY_SIZE : Math.round(DISPLAY_SIZE * ratio);
    height = ratio >= 1 ? Math.round(DISPLAY_SIZE / ratio) : DISPLAY_SIZE;
  }
  return {
    src: photo.src,
    msrc: photo.thumb,
    width,
    height,
    alt: photo.alt,
    // zooms out of the grid's square tile and back into it
    element: thumb,
    thumbCropped: true,
  };
};

// The full-screen photo viewer. Provided by the page, so it closes when the page goes.
@Injectable()
export class PhotoViewer {
  private viewer?: PhotoSwipe;
  private destroyed = false;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      const viewer = this.viewer;
      if (!viewer) {
        return;
      }
      // PhotoSwipe ignores closing while it's still opening, so it leaves the screen now and is
      // cleaned up once it has opened
      viewer.element?.remove();
      if (viewer.opener.isOpening) {
        viewer.on("openingAnimationEnd", () => viewer.destroy());
      } else {
        viewer.destroy();
      }
    });
  }

  async open(photos: Photo[], index: number, thumbs: (HTMLImageElement | undefined)[]) {
    const { default: PhotoSwipe } = await import("photoswipe");
    if (this.destroyed) {
      return;
    }
    this.viewer?.destroy();
    const viewer = new PhotoSwipe({
      dataSource: photos.map((photo, i) => slideFor(photo, thumbs[i])),
      index,
      bgOpacity: 1,
      preload: [1, 2],
      closeTitle: "Close",
      zoomTitle: "Zoom",
      arrowPrevTitle: "Previous photo",
      arrowNextTitle: "Next photo",
      indexIndicatorSep: " of ",
      errorMsg: "We couldn't load this photo.",
    });

    viewer.on("uiRegister", () => {
      viewer.ui?.registerElement({
        name: "caption",
        appendTo: "root",
        onInit: (element) =>
          viewer.on("change", () => {
            element.textContent = photos[viewer.currIndex]?.caption ?? "";
          }),
      });
    });

    // PhotoSwipe only reports loads for slides on screen, so a photo loaded ahead is watched directly
    viewer.on("contentLoadImage", ({ content }) => {
      const image = content.element;
      if (!(image instanceof HTMLImageElement)) {
        return;
      }
      image.addEventListener(
        "load",
        () => {
          // shown only now (see photo-viewer.scss); PhotoSwipe keeps the thumbnail under it a while longer
          image.classList.add("pswp__img--loaded");
          const { naturalWidth: width, naturalHeight: height } = image;
          if (!width || (width === content.width && height === content.height)) {
            return;
          }
          content.width = content.data.width = width;
          content.height = content.data.height = height;
          if (content.slide) {
            content.slide.width = width;
            content.slide.height = height;
            content.slide.resize();
          }
        },
        { once: true },
      );
    });

    viewer.on("destroy", () => {
      if (this.viewer === viewer) {
        this.viewer = undefined;
      }
    });
    this.viewer = viewer;
    viewer.init();
    viewer.element?.addEventListener("contextmenu", (event) => event.preventDefault());
  }
}
