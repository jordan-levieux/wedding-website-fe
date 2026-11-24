import { TestBed } from "@angular/core/testing";
import { Photo } from "./gallery";
import { PhotoViewer, slideFor } from "./photo-viewer";

const photo = (name: string, extra: Partial<Photo> = {}): Photo => ({
  src: `https://picsum.photos/seed/${name}/2560/1707`,
  thumb: `https://picsum.photos/seed/${name}/800/533`,
  alt: name,
  caption: null,
  width: 2560,
  height: 1707,
  ...extra,
});

// a thumbnail that has loaded at the given size
const thumbOf = (width: number, height: number) => {
  const image = document.createElement("img");
  Object.defineProperty(image, "naturalWidth", { value: width });
  Object.defineProperty(image, "naturalHeight", { value: height });
  return image;
};

describe("slideFor", () => {
  it("uses the stored size and zooms out of the thumbnail", () => {
    const thumb = thumbOf(800, 533);
    expect(slideFor(photo("moss"), thumb)).toEqual({
      src: "https://picsum.photos/seed/moss/2560/1707",
      msrc: "https://picsum.photos/seed/moss/800/533",
      width: 2560,
      height: 1707,
      alt: "moss",
      element: thumb,
      thumbCropped: true,
    });
  });

  it("guesses a size from the thumbnail's shape when none was stored", () => {
    const unsized = photo("ferns", { width: null, height: null });
    expect(slideFor(unsized, thumbOf(600, 800))).toMatchObject({ width: 1920, height: 2560 });
    expect(slideFor(unsized, thumbOf(0, 0))).toMatchObject({ width: 2560, height: 1707 });
    expect(slideFor(unsized)).toMatchObject({ width: 2560, height: 1707 });
  });
});

describe("PhotoViewer", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
    TestBed.configureTestingModule({ providers: [PhotoViewer] });
  });

  afterEach(() => vi.unstubAllGlobals());

  it("shows the photo with its caption and position, and goes when its page does", async () => {
    await TestBed.inject(PhotoViewer).open(
      [photo("moss", { caption: "Knysna forest" }), photo("lichen")],
      0,
      [],
    );
    const viewer = document.querySelector(".pswp")!;
    expect(viewer.querySelector(".pswp__caption")!.textContent).toBe("Knysna forest");
    // PhotoSwipe sets innerText, which the test DOM keeps apart from textContent
    expect(viewer.querySelector<HTMLElement>(".pswp__counter")!.innerText).toBe("1 of 2");

    TestBed.resetTestingModule();
    await vi.waitFor(() => expect(document.querySelector(".pswp")).toBeNull());
  });
});
