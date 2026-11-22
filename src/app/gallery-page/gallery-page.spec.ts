import { provideHttpClient } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { provideRouter, Router, withComponentInputBinding } from "@angular/router";
import { RouterTestingHarness } from "@angular/router/testing";
import { environment } from "../../environments/environment";
import { GalleryResponse } from "./gallery";
import { GalleryPage } from "./gallery-page";

const galleryUrl = `${environment.apiUrl}/gallery`;
const photo = (name: string, caption: string | null = null) => ({
  name,
  url: `https://storage.googleapis.com/signed/${name}`,
  alt: null,
  caption,
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
  let dialog: HTMLDialogElement;

  const setup = async (url = "/gallery", respond: GalleryResponse | "fail" = listing) => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: "gallery", component: GalleryPage }], withComponentInputBinding()),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
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
    dialog = element.querySelector("dialog")!;
    // not every test DOM implements modal dialogs
    dialog.showModal ??= function (this: HTMLDialogElement) {
      this.setAttribute("open", "");
    };
    dialog.close = function (this: HTMLDialogElement) {
      this.removeAttribute("open");
      this.dispatchEvent(new Event("close"));
    };
  };

  // the response reaches the page through a promise, a tick after it's flushed
  const settle = async () => {
    await new Promise((resolve) => setTimeout(resolve));
    await harness.fixture.whenStable();
  };

  const albumButtons = () => [...element.querySelectorAll<HTMLButtonElement>(".album")];
  const caption = () =>
    [...dialog.querySelectorAll("figcaption span")].map((span) => span.textContent!.trim());

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

  it("offers to try again when the photos can't be loaded", async () => {
    await setup("/gallery", "fail");
    expect(element.textContent).toContain("We couldn't load the photos");
    element.querySelector<HTMLButtonElement>(".failed button")!.click();
    TestBed.inject(HttpTestingController).expectOne(galleryUrl).flush(listing);
    await settle();
    expect(element.querySelectorAll(".tile")).toHaveLength(3);
  });

  it("opens straight to the album in the address", async () => {
    await setup("/gallery?album=us");
    expect(albumButtons()[1]!.getAttribute("aria-pressed")).toBe("true");
  });

  it("opens a photo larger and steps through the album, wrapping around", async () => {
    await setup();
    element.querySelectorAll<HTMLButtonElement>(".tile")[0]!.click();
    await harness.fixture.whenStable();
    expect(dialog.hasAttribute("open")).toBe(true);
    expect(dialog.querySelector<HTMLImageElement>(".figure img")!.alt).toBe("Orange fungus");
    expect(dialog.querySelector<HTMLImageElement>(".figure img")!.src).toBe(
      "https://storage.googleapis.com/signed/artistry_of_the_forest_floor/display/1_orange-fungus.jpg",
    );
    expect(caption()).toEqual(["Knysna forest", "1 of 3"]);

    dialog.querySelector<HTMLButtonElement>(".previous")!.click();
    await harness.fixture.whenStable();
    expect(caption()).toEqual(["3 of 3"]);

    dialog.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }));
    await harness.fixture.whenStable();
    expect(caption()).toEqual(["Knysna forest", "1 of 3"]);

    dialog.querySelector<HTMLButtonElement>(".close")!.click();
    await harness.fixture.whenStable();
    expect(dialog.hasAttribute("open")).toBe(false);
    expect(dialog.querySelector("figure")).toBeNull();
    expect(document.documentElement.style.overflow).toBe("");
  });
});
