import { Clipboard } from "@angular/cdk/clipboard";
import { TestbedHarnessEnvironment } from "@angular/cdk/testing/testbed";
import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { MatExpansionPanelHarness } from "@angular/material/expansion/testing";
import { bankingDetails } from "../../environments/banking-details";
import { InfoPage } from "./info-page";

describe("InfoPage", () => {
  const setup = async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(InfoPage);
    await fixture.whenStable();
    return {
      fixture,
      element: fixture.nativeElement as HTMLElement,
      loader: TestbedHarnessEnvironment.loader(fixture),
    };
  };

  it("shows the weekend, theme, dress code and gifts", async () => {
    const { element } = await setup();
    expect([...element.querySelectorAll("h2")].map((h2) => h2.textContent!.trim())).toEqual([
      "The plans for the weekend",
      "Theme",
      "Dress code",
      "Gifts",
    ]);
    expect(element.textContent).toContain("The Artistry of the Forest Floor");
    expect(element.querySelector(".gallery-link")!.getAttribute("href")).toBe("/gallery");
  });

  it("lays out each day of the weekend with its times", async () => {
    const { element } = await setup();
    const days = [...element.querySelectorAll(".day")].map((day) => ({
      day: day.querySelector("h3")!.textContent!.trim(),
      times: [...day.querySelectorAll(".when")].map((when) => when.textContent!.trim()),
    }));
    expect(days).toEqual([
      { day: "Friday 12 March", times: ["16:00"] },
      { day: "Saturday 13 March The wedding", times: ["Morning", "15:30", "15:45", "After"] },
      { day: "Sunday 14 March", times: ["Around 09:00"] },
    ]);
  });

  // the details themselves live in a gitignored file, so this only relies on the rows it has
  it("keeps the banking details folded away, with a copy button for each one filled in", async () => {
    const filled = bankingDetails.filter((row) => row.value.trim());
    if (!filled.length) {
      return;
    }
    const { element, loader, fixture } = await setup();
    const panel = await loader.getHarness(MatExpansionPanelHarness);
    expect(await panel.getTitle()).toContain("Banking details");
    expect(await panel.isExpanded()).toBe(false);

    await panel.expand();
    const copy = vi.spyOn(TestBed.inject(Clipboard), "copy").mockReturnValue(true);
    const buttons = element.querySelectorAll<HTMLButtonElement>(".bank-row button");
    expect(buttons).toHaveLength(filled.length);
    buttons[0]!.click();
    await fixture.whenStable();
    expect(copy).toHaveBeenCalledWith(filled[0]!.value);
  });
});
