import { ComponentFixture, DeferBlockState, TestBed } from "@angular/core/testing";
import { By } from "@angular/platform-browser";
import { Coordinates } from "../../models/api";
import { GoogleMapsLoader } from "../../services/googleMapsLoader";
import { LocationPicker } from "../location-picker/location-picker";
import { PlaceEditor } from "./place-editor";

describe("PlaceEditor", () => {
  let fixture: ComponentFixture<PlaceEditor>;
  let saved: (Coordinates | null)[];

  const setup = async (
    inputs: { place?: Coordinates | null; disabled?: boolean } = {},
    mapsAvailable = true,
  ) => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: GoogleMapsLoader,
          // never resolves: the picker stays on its loading state, which is all these tests need
          useValue: { available: mapsAvailable, load: () => new Promise(() => {}) },
        },
      ],
    });
    fixture = TestBed.createComponent(PlaceEditor);
    Object.entries(inputs).forEach(([name, value]) => fixture.componentRef.setInput(name, value));
    saved = [];
    fixture.componentInstance.save.subscribe((place) => saved.push(place));
    await fixture.whenStable();
  };

  const element = () => fixture.nativeElement as HTMLElement;
  const text = () => element().textContent ?? "";
  const click = async (label: string) => {
    [...element().querySelectorAll<HTMLButtonElement>("button")]
      .find((button) => button.textContent?.includes(label))!
      .click();
    await fixture.whenStable();
  };
  const renderMap = async () => {
    const [mapBlock] = await fixture.getDeferBlocks();
    await mapBlock!.render(DeferBlockState.Complete);
    await fixture.whenStable();
    return fixture.debugElement.query(By.directive(LocationPicker))
      .componentInstance as LocationPicker;
  };

  it("opens on the map when nothing is pinned, and saves a new pin", async () => {
    await setup();
    const picker = await renderMap();
    expect(text()).toContain("Loading the map");

    picker.value.set({ lat: -33.9249, lng: 18.4241 });
    await fixture.whenStable();
    expect(text()).toContain("New location pinned");
    expect(
      element().querySelector<HTMLAnchorElement>("a[href*='google.com/maps']")?.href,
    ).toContain("query=-33.9249,18.4241");

    await click("Save location");
    expect(saved).toEqual([{ lat: -33.9249, lng: 18.4241 }]);
  });

  it("shows a saved place without loading the map until it's changed", async () => {
    await setup({ place: { lat: -33.9, lng: 18.4 } });
    expect(text()).toContain("Location pinned");
    expect(await fixture.getDeferBlocks()).toHaveLength(0);

    await click("Change");
    await click("Clear");
    await click("Remove location");
    expect(saved).toEqual([null]);
  });

  it("cancelling a change puts the saved place back", async () => {
    await setup({ place: { lat: -33.9, lng: 18.4 } });
    await click("Change");
    await click("Clear");
    expect(text()).not.toContain("Location pinned");
    await click("Cancel");
    expect(text()).toContain("Location pinned");
    expect(text()).toContain("Change");
    expect(saved).toEqual([]);
  });

  it("is read-only when disabled", async () => {
    await setup({ place: { lat: -33.9, lng: 18.4 }, disabled: true });
    expect(text()).toContain("Check on Google Maps");
    expect(element().querySelector("button")).toBeNull();
  });

  it("explains when the map isn't available", async () => {
    await setup({}, false);
    expect(text()).toContain("The map isn't available right now");
  });
});
