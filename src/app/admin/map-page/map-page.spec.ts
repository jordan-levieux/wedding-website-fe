import { TestBed } from "@angular/core/testing";
import { GoogleMapsLoader } from "../../services/googleMapsLoader";
import { adminApi, adminGuest, COMING, setupAdminPage } from "../admin-testing";
import { MapPage } from "./map-page";

const hotel = { lat: -33.96, lng: 22.46 };
const GUESTS = [
  adminGuest({ rsvp: { ...COMING, accommodation: hotel } }),
  adminGuest({
    guestId: 2,
    name: "Bob",
    rsvp: { ...COMING, shuttle: false, accommodation: hotel },
  }),
  adminGuest({
    guestId: 3,
    groupId: 2,
    name: "Carl",
    surname: "Botha",
    rsvp: { ...COMING, accommodation: null },
  }),
  adminGuest({ guestId: 4, groupId: 3, name: "Dee", surname: "Nel" }),
];

describe("MapPage", () => {
  const open = async (maps: Partial<GoogleMapsLoader>) => {
    TestBed.overrideProvider(GoogleMapsLoader, { useValue: maps });
    const page = await setupAdminPage(
      ["viewer"],
      [{ path: "admin/map", component: MapPage }],
      "/admin/map",
    );
    page.http.expectOne(`${adminApi}/guests`).flush(GUESTS);
    await page.settle();
    return page;
  };

  it("lists each place and who hasn't pinned theirs", async () => {
    // never resolves, so the page stays on the map's loading state
    const { text, element } = await open({ available: true, load: () => new Promise(() => {}) });
    expect(text()).toContain("2 of the 3 guests who are coming have pinned where they're staying");
    expect(text()).toContain("Loading the map");
    const place = element().querySelector(".place")!;
    expect(place.querySelector(".count")!.textContent!.trim()).toBe("2");
    expect(place.textContent!.replace(/\s+/g, " ")).toContain("Alice Smith, Bob Smith");
    expect(place.textContent!.replace(/\s+/g, " ")).toContain(
      "19 km from the venue · 1 on the shuttle",
    );
    expect(
      [...element().querySelectorAll(".unpinned")].map((li) => li.textContent!.trim()),
    ).toEqual(["Carl Botha"]);
  });

  it("still lists the places without a Maps key", async () => {
    const { text, element } = await open({ available: false });
    expect(text()).toContain("The map isn't available right now");
    expect(element().querySelectorAll(".place")).toHaveLength(1);
    expect(element().querySelector("button[aria-label='Show on the map']")).toBeNull();
  });
});
