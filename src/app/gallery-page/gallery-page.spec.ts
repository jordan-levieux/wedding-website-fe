import { provideHttpClient } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { provideRouter, Router, withComponentInputBinding } from "@angular/router";
import { RouterTestingHarness } from "@angular/router/testing";
import { environment } from "../../environments/environment";
import { GalleryResponse } from "./gallery";
import { GalleryPage } from "./gallery-page";
import { PhotoViewer } from "./photo-viewer";

const galleryUrl = `${environment.apiUrl}/gallery`;
const photo = (name: string, caption: string | null = null) => ({
  name,
  url: `https://storage.googleapis.com/signed/${name}`,
  alt: null,
  caption,
  width: 2560,
  height: 1707,
});
const listing: GalleryResponse = {
  photos: ["1_orange-fungus", "2_blue-lichen", "3_ferns"].flatMap((name, index) => [
    photo(`artistry_of_the_forest_floor/display/${name}.jpg`, index ? null : "Knysna forest"),
    photo(`artistry_of_the_forest_floor/thumbs/${name}.webp`),
  ]),
};

describe("GalleryPage", () => {
  let harness: RouterTestingHarness;
  let element: HTMLElement;
  let open: ReturnType<typeof vi.fn>;

  const setup = async (url = "/gallery", respond: GalleryResponse | "fail" = listing) => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: "gallery", component: GalleryPage }], withComponentInputBinding()),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    open = vi.fn();
    TestBed.overrideComponent(GalleryPage, {
      set: { providers: [{ provide: PhotoViewer, useValue: { open } }] },
    });
    harness = await RouterTestingHarness.create(url);
    const request = TestBed.inject(HttpTestingController).expectOne(galleryUrl);
    if (respond === "fail") {
      request.flush(null, { status: 500, statusText: "Server Error" });
    } else {
      request.flush(respond);
    }
    await settle();
    element = harness.routeNativeElement!;
  };

  // the response reaches the page through a promise, a tick after it's flushed
  const settle = async () => {
    await new Promise((resolve) => setTimeout(resolve));
    await harness.fixture.whenStable();
  };

  const albumButtons = () => [...element.querySelectorAll<HTMLButtonElement>(".album")];

  it("offers both albums and shows the first one's photos", async () => {
    await setup();
    expect(
      albumButtons().map((button) => button.querySelector(".album-title")!.textContent),
    ).toEqual(["The Artistry of the Forest Floor", "Hyla and Jordan"]);
    expect(albumButtons().map((button) => button.getAttribute("aria-pressed"))).toEqual([
      "true",
      "false",
    ]);
    expect(albumButtons()[1]!.querySelector(".album-count")!.textContent).toContain("Coming soon");
    expect(element.querySelectorAll(".tile")).toHaveLength(3);
    expect(element.querySelector<HTMLImageElement>(".tile img")!.src).toBe(
      "https://storage.googleapis.com/signed/artistry_of_the_forest_floor/thumbs/1_orange-fungus.webp",
    );
  });

  it("switches album, keeping the choice in the address", async () => {
    await setup();
    albumButtons()[1]!.click();
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe("/gallery?album=us");
    expect(element.querySelector("h2")!.textContent).toBe("Hyla and Jordan");
    expect(element.querySelectorAll(".tile")).toHaveLength(0);
    expect(element.querySelector(".empty")!.textContent).toContain("Photos coming soon");
  });

  it("shimmers placeholder tiles while the album loads, then each tile until its photo arrives", async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: "gallery", component: GalleryPage }], withComponentInputBinding()),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    TestBed.overrideComponent(GalleryPage, {
      set: { providers: [{ provide: PhotoViewer, useValue: { open: vi.fn() } }] },
    });
    harness = await RouterTestingHarness.create("/gallery");
    element = harness.routeNativeElement!;
    expect(element.querySelector("[role=status]")!.textContent).toContain("Loading photos");
    expect(element.querySelectorAll(".placeholder.shimmer")).toHaveLength(6);
    expect(element.querySelector(".cover")!.classList).toContain("shimmer");

    TestBed.inject(HttpTestingController).expectOne(galleryUrl).flush(listing);
    await settle();
    expect(element.querySelector(".placeholder")).toBeNull();
    const tiles = [...element.querySelectorAll(".tile")];
    expect(tiles.every((tile) => tile.classList.contains("shimmer"))).toBe(true);

    tiles[0]!.querySelector("img")!.dispatchEvent(new Event("load"));
    await harness.fixture.whenStable();
    expect(tiles.map((tile) => tile.classList.contains("shimmer"))).toEqual([false, true, true]);
    // the first photo is also the album's cover
    expect(element.querySelector(".cover")!.classList).not.toContain("shimmer");
  });

  it("offers to try again when the photos can't be loaded", async () => {
    await setup("/gallery", "fail");
    expect(element.textContent).toContain("We couldn't load the photos");
    element.querySelector<HTMLButtonElement>(".failed button")!.click();
    TestBed.inject(HttpTestingController).expectOne(galleryUrl).flush(listing);
    await settle();
    expect(element.querySelectorAll(".tile")).toHaveLength(3);
  });

  it("keeps the right-click and long-press menu off the photos", async () => {
    await setup();
    for (const image of element.querySelectorAll(".tile img, .cover img")) {
      const menu = new MouseEvent("contextmenu", { bubbles: true, cancelable: true });
      image.dispatchEvent(menu);
      expect(menu.defaultPrevented).toBe(true);
      expect(image.getAttribute("draggable")).toBe("false");
    }
  });

  it("opens straight to the album in the address", async () => {
    await setup("/gallery?album=us");
    expect(albumButtons()[1]!.getAttribute("aria-pressed")).toBe("true");
  });

  it("opens a photo in the viewer, with the rest of the album to step through", async () => {
    await setup();
    element.querySelectorAll<HTMLButtonElement>(".tile")[1]!.click();
    const [photos, index, thumbs] = open.mock.calls[0]!;
    expect(index).toBe(1);
    expect(photos.map((photo: { alt: string }) => photo.alt)).toEqual([
      "Orange fungus",
      "Blue lichen",
      "Ferns",
    ]);
    expect(thumbs).toEqual([...element.querySelectorAll(".tile img")]);
  });
});
