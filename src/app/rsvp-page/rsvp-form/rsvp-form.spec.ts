import { HarnessLoader } from "@angular/cdk/testing";
import { TestbedHarnessEnvironment } from "@angular/cdk/testing/testbed";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { MatInputHarness } from "@angular/material/input/testing";
import { MatRadioGroupHarness } from "@angular/material/radio/testing";
import { MatSelectHarness } from "@angular/material/select/testing";
import { GroupGuest, RsvpInput } from "../../models/api";
import { PrefilledField, RsvpDraft } from "../../models/rsvp";
import { RsvpForm } from "./rsvp-form";

const bob: GroupGuest = { guestId: 2, name: "Bob", surname: "Smith", rsvp: null };
const blank: RsvpDraft = {
  attending: null,
  dietary: null,
  dietaryOtherDetails: "",
  shuttle: "unsure",
  accommodation: "",
};

describe("RsvpForm", () => {
  let fixture: ComponentFixture<RsvpForm>;
  let loader: HarnessLoader;
  let saved: RsvpInput[];

  const setup = async (
    options: { draft?: RsvpDraft; prefilled?: PrefilledField[]; closed?: boolean } = {},
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

  const text = () => (fixture.nativeElement as HTMLElement).textContent ?? "";
  const radioGroup = (index: number) =>
    loader.getAllHarnesses(MatRadioGroupHarness).then((groups) => groups[index]!);
  const answerAttending = async (label: string) =>
    (await radioGroup(0)).checkRadioButton({ label });
  const chooseDietary = async (option: string) => {
    const select = await loader.getHarness(MatSelectHarness);
    await select.open();
    await select.clickOptions({ text: option });
  };
  const location = () => loader.getHarness(MatInputHarness.with({ placeholder: "-33.92, 18.42" }));
  const send = async () => {
    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>("button[type=submit]")!
      .click();
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
    await answerAttending("Sadly not");
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
    await answerAttending("Yes, wouldn't miss it");
    await send();
    expect(saved).toEqual([]);
    expect(text()).toContain("Please choose one");

    await chooseDietary("Other (tell us more)");
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

  it("reads a Google Maps link as where they're staying, and rejects text without a location", async () => {
    await setup();
    await answerAttending("Yes, wouldn't miss it");
    await chooseDietary("Vegetarian");
    await (await radioGroup(1)).checkRadioButton({ label: "Yes please" });

    await (await location()).setValue("my aunt's house");
    await (await location()).blur();
    await send();
    expect(saved).toEqual([]);
    expect(text()).toContain("We couldn't find a location in that");

    await (
      await location()
    ).setValue(
      "https://www.google.com/maps/place/Guesthouse/@-33.91,18.41,17z/data=!3d-33.9249!4d18.4241",
    );
    await fixture.whenStable();
    expect(text()).toContain("Check it on the map");
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
  });

  it("shows the answers that were copied from the caller's RSVP", async () => {
    await setup({
      draft: { ...blank, attending: "yes", shuttle: "yes", accommodation: "-33.9, 18.4" },
      prefilled: ["shuttle", "accommodation"],
    });
    expect(await (await radioGroup(1)).getCheckedValue()).toBe("yes");
    expect(await (await location()).getValue()).toBe("-33.9, 18.4");
    expect(text().match(/Copied from your RSVP/g)).toHaveLength(2);
  });

  it("is read-only once RSVPs have closed", async () => {
    await setup({ draft: { ...blank, attending: "no" }, closed: true });
    expect((fixture.nativeElement as HTMLElement).querySelector("button[type=submit]")).toBeNull();
    const buttons = await (await radioGroup(0)).getRadioButtons();
    expect(await Promise.all(buttons.map((button) => button.isDisabled()))).toEqual([true, true]);
  });
});
