import { HarnessLoader } from "@angular/cdk/testing";
import { TestbedHarnessEnvironment } from "@angular/cdk/testing/testbed";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { MatButtonToggleGroupHarness } from "@angular/material/button-toggle/testing";
import { MatChipListboxHarness } from "@angular/material/chips/testing";
import { MatInputHarness } from "@angular/material/input/testing";
import { GroupGuest, RsvpInput } from "../../models/api";
import { PrefilledField, RsvpDraft } from "../../models/rsvp";
import { RsvpForm } from "./rsvp-form";

const bob: GroupGuest = {
  guestId: 2,
  name: "Bob",
  surname: "Smith",
  rsvp: null,
  ownAccommodation: null,
};
const blank: RsvpDraft = {
  attending: null,
  dietary: null,
  dietaryOtherDetails: "",
  shuttle: "unsure",
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
    } = {},
  ) => {
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
      },
    ]);
  });

  it("shows the answers that were copied from the caller's RSVP", async () => {
    await setup({
      draft: {
        ...blank,
        attending: "yes",
        shuttle: "yes",
      },
      prefilled: ["shuttle"],
    });
    const [yes] = await (await choice(1)).getToggles({ text: "Yes please" });
    expect(await yes!.isChecked()).toBe(true);
    expect(text().match(/Copied from your RSVP/g)).toHaveLength(1);
  });

  it("is read-only once RSVPs have closed", async () => {
    await setup({ draft: { ...blank, attending: "no" }, closed: true });
    expect(element().querySelector("button[type=submit]")).toBeNull();
    const toggles = await (await choice(0)).getToggles();
    expect(await Promise.all(toggles.map((toggle) => toggle.isDisabled()))).toEqual([true, true]);
  });
});
