import { HarnessLoader } from "@angular/cdk/testing";
import { TestbedHarnessEnvironment } from "@angular/cdk/testing/testbed";
import { ComponentFixture, DeferBlockState, TestBed } from "@angular/core/testing";
import { By } from "@angular/platform-browser";
import { MatButtonToggleGroupHarness } from "@angular/material/button-toggle/testing";
import { MatChipListboxHarness } from "@angular/material/chips/testing";
import { MatInputHarness } from "@angular/material/input/testing";
import { GroupGuest, RsvpInput } from "../../models/api";
import { PrefilledField, RsvpDraft } from "../../models/rsvp";
import { GoogleMapsLoader } from "../../services/googleMapsLoader";
import { LocationPicker } from "../location-picker/location-picker";
import { RsvpForm } from "./rsvp-form";

const bob: GroupGuest = { guestId: 2, name: "Bob", surname: "Smith", rsvp: null };
const blank: RsvpDraft = {
  attending: null,
  dietary: null,
  dietaryOtherDetails: "",
  shuttle: "unsure",
  accommodation: null,
};

describe("RsvpForm", () => {
  let fixture: ComponentFixture<RsvpForm>;
  let loader: HarnessLoader;
  let saved: RsvpInput[];

  const setup = async (
    options: {
      draft?: RsvpDraft;
      prefilled?: PrefilledField[];
      closed?: boolean;
      mapsAvailable?: boolean;
    } = {},
  ) => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: GoogleMapsLoader,
          // never resolves: the picker stays on its loading state, which is all these tests need
          useValue: {
            available: options.mapsAvailable ?? false,
            load: () => new Promise(() => {}),
          },
        },
      ],
    });
    fixture = TestBed.createComponent(RsvpForm);
    fixture.componentRef.setInput("guest", bob);
    fixture.componentRef.setInput("draft", options.draft ?? blank);
    fixture.componentRef.setInput("prefilled", options.prefilled ?? []);
    fixture.componentRef.setInput("closed", options.closed ?? false);
    saved = [];
    fixture.componentInstance.save.subscribe((input) => saved.push(input));
    loader = TestbedHarnessEnvironment.loader(fixture);
    await fixture.whenStable();
  };

  const element = () => fixture.nativeElement as HTMLElement;
  const text = () => element().textContent ?? "";
  const choice = (index: number) =>
    loader.getAllHarnesses(MatButtonToggleGroupHarness).then((groups) => groups[index]!);
  const choose = async (index: number, label: string) => {
    const [toggle] = await (await choice(index)).getToggles({ text: label });
    await toggle!.check();
  };
  const chooseDietary = async (label: string) =>
    (await loader.getHarness(MatChipListboxHarness)).selectChips({ text: label });
  const renderMap = async () => {
    const [mapBlock] = await fixture.getDeferBlocks();
    await mapBlock!.render(DeferBlockState.Complete);
    await fixture.whenStable();
    return fixture.debugElement.query(By.directive(LocationPicker))
      .componentInstance as LocationPicker;
  };
  const clickButton = async (label: string) => {
    [...element().querySelectorAll<HTMLButtonElement>("button")]
      .find((button) => button.textContent?.includes(label))!
      .click();
    await fixture.whenStable();
  };
  const send = async () => {
    element().querySelector<HTMLButtonElement>("button[type=submit]")!.click();
    await new Promise((resolve) => setTimeout(resolve));
    await fixture.whenStable();
  };

  it("doesn't send until they say whether they're coming", async () => {
    await setup();
    await send();
    expect(saved).toEqual([]);
    expect(text()).toContain("Please let us know either way");
  });

  it("sends just the answer for someone who isn't coming", async () => {
    await setup();
    await choose(0, "Regretfully decline");
    await send();
    expect(saved).toEqual([
      {
        guestId: 2,
        attending: false,
        dietary: null,
        dietaryOtherDetails: null,
        shuttle: null,
        accommodation: null,
      },
    ]);
  });

  it("needs a dietary answer from someone coming, and details for 'other'", async () => {
    await setup();
    await choose(0, "Joyfully accept");
    await send();
    expect(saved).toEqual([]);
    expect(text()).toContain("Please choose one");

    await chooseDietary("Other");
    await send();
    expect(saved).toEqual([]);
    expect(text()).toContain("Please tell us what we should know");

    const details = await loader.getHarness(MatInputHarness.with({ selector: "textarea" }));
    await details.setValue("  no mushrooms ");
    await send();
    expect(saved).toEqual([
      {
        guestId: 2,
        attending: true,
        dietary: "other",
        dietaryOtherDetails: "no mushrooms",
        shuttle: null,
        accommodation: null,
      },
    ]);
  });

  it("pins where they're staying from the map, and can clear it again", async () => {
    await setup({ mapsAvailable: true });
    await choose(0, "Joyfully accept");
    await chooseDietary("Vegetarian");
    await choose(1, "Yes please");

    const picker = await renderMap();
    expect(text()).toContain("Loading the map");
    picker.value.set({ lat: -33.9249, lng: 18.4241 });
    await fixture.whenStable();
    expect(text()).toContain("Location pinned");
    expect(
      element().querySelector<HTMLAnchorElement>("a[href*='google.com/maps']")?.href,
    ).toContain("query=-33.9249,18.4241");

    await send();
    expect(saved).toEqual([
      {
        guestId: 2,
        attending: true,
        dietary: "vegetarian",
        dietaryOtherDetails: null,
        shuttle: true,
        accommodation: { lat: -33.9249, lng: 18.4241 },
      },
    ]);

    await clickButton("Clear");
    expect(text()).not.toContain("Location pinned");
    expect(picker.value()).toBeNull();
  });

  it("shows the answers that were copied from the caller's RSVP", async () => {
    await setup({
      draft: {
        ...blank,
        attending: "yes",
        shuttle: "yes",
        accommodation: { lat: -33.9, lng: 18.4 },
      },
      prefilled: ["shuttle", "accommodation"],
    });
    const [yes] = await (await choice(1)).getToggles({ text: "Yes please" });
    expect(await yes!.isChecked()).toBe(true);
    expect(text()).toContain("Location pinned");
    expect(text().match(/Copied from your RSVP/g)).toHaveLength(2);
  });

  it("explains when the map isn't available", async () => {
    await setup({ draft: { ...blank, attending: "yes" } });
    expect(text()).toContain("The map isn't available right now");
  });

  it("is read-only once RSVPs have closed", async () => {
    await setup({ draft: { ...blank, attending: "no" }, closed: true });
    expect(element().querySelector("button[type=submit]")).toBeNull();
    const toggles = await (await choice(0)).getToggles();
    expect(await Promise.all(toggles.map((toggle) => toggle.isDisabled()))).toEqual([true, true]);
  });
});
