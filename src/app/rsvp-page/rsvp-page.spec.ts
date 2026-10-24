import { HarnessLoader } from "@angular/cdk/testing";
import { TestbedHarnessEnvironment } from "@angular/cdk/testing/testbed";
import { provideHttpClient } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { MatExpansionPanelHarness } from "@angular/material/expansion/testing";
import { MatInputHarness } from "@angular/material/input/testing";
import { MatRadioGroupHarness } from "@angular/material/radio/testing";
import { MatSelectHarness } from "@angular/material/select/testing";
import { environment } from "../../environments/environment";
import { Group, Rsvp } from "../models/api";
import { GroupService } from "../services/groupService";
import { RsvpPage } from "./rsvp-page";

const FUTURE = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
const PAST = new Date(Date.now() - 1000).toISOString();

const aliceAnswer: Rsvp = {
  attending: true,
  dietary: "none",
  dietaryOtherDetails: null,
  shuttle: true,
  accommodation: { lat: -33.9249, lng: 18.4241 },
  respondedBy: 1,
  respondedAt: "2026-10-24T10:00:00.000Z",
};

const makeGroup = (
  overrides: Partial<Group> = {},
  aliceRsvp: Rsvp | null = aliceAnswer,
): Group => ({
  selfId: 1,
  roles: [],
  rsvpDeadline: FUTURE,
  guests: [
    { guestId: 1, name: "Alice", surname: "Smith", rsvp: aliceRsvp },
    { guestId: 2, name: "Bob", surname: "Smith", rsvp: null },
    { guestId: 3, name: "Cleo", surname: "Smith", rsvp: null },
  ],
  ...overrides,
});

describe("RsvpPage", () => {
  let fixture: ComponentFixture<RsvpPage>;
  let loader: HarnessLoader;
  let http: HttpTestingController;
  let groupService: GroupService;

  const setup = async (group: Group) => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    groupService = TestBed.inject(GroupService);
    groupService.setGroup(group);
    fixture = TestBed.createComponent(RsvpPage);
    loader = TestbedHarnessEnvironment.loader(fixture);
    await fixture.whenStable();
  };
  const text = () => (fixture.nativeElement as HTMLElement).textContent ?? "";
  const forms = () => (fixture.nativeElement as HTMLElement).querySelectorAll("app-rsvp-form");

  afterEach(() => http.verify());

  it("asks for their own RSVP before showing the rest of the group", async () => {
    await setup(makeGroup({}, null));
    expect(text()).toContain("Hi Alice");
    expect(forms()).toHaveLength(1);
    expect(text()).not.toContain("Your group");
  });

  it("once they've answered, lists the group with the next person to answer opened", async () => {
    await setup(makeGroup());
    expect(text()).toContain("Coming · No dietary requirements · on the shuttle");
    const panels = await loader.getAllHarnesses(MatExpansionPanelHarness);
    expect(await Promise.all(panels.map((panel) => panel.getTitle()))).toEqual([
      "Bob Smith",
      "Cleo Smith",
    ]);
    expect(await Promise.all(panels.map((panel) => panel.isExpanded()))).toEqual([true, false]);
    expect(await panels[0]!.getDescription()).toBe("Hasn't RSVPed yet");
  });

  it("saves someone else's RSVP with the copied shuttle and accommodation answers", async () => {
    await setup(makeGroup());
    const bobPanel = (await loader.getAllHarnesses(MatExpansionPanelHarness))[0]!;
    await (
      await bobPanel.getHarness(MatRadioGroupHarness)
    ).checkRadioButton({ label: "Yes, wouldn't miss it" });
    const dietary = await bobPanel.getHarness(MatSelectHarness);
    await dietary.open();
    await dietary.clickOptions({ text: "Vegetarian" });
    expect(await (await bobPanel.getHarness(MatInputHarness)).getValue()).toBe("-33.9249, 18.4241");

    (fixture.nativeElement as HTMLElement)
      .querySelectorAll<HTMLButtonElement>("mat-expansion-panel button[type=submit]")[0]!
      .click();
    await new Promise((resolve) => setTimeout(resolve));

    const request = http.expectOne(`${environment.apiUrl}/rsvp`);
    expect(request.request.method).toBe("PUT");
    expect(request.request.body).toEqual({
      rsvps: [
        {
          guestId: 2,
          attending: true,
          dietary: "vegetarian",
          dietaryOtherDetails: null,
          shuttle: true,
          accommodation: { lat: -33.9249, lng: 18.4241 },
        },
      ],
    });
    const updated = makeGroup();
    updated.guests[1]!.rsvp = { ...aliceAnswer, dietary: "vegetarian" };
    request.flush(updated);
    await fixture.whenStable();

    const panels = await loader.getAllHarnesses(MatExpansionPanelHarness);
    expect(await panels[0]!.getDescription()).toBe("Coming");
    expect(await panels[1]!.isExpanded()).toBe(true);
  });

  it("shows the venue suggestion to guests who are encouraged to book there", async () => {
    await setup(makeGroup({ roles: ["venue_accommodation"] }, null));
    await (
      await loader.getHarness(MatRadioGroupHarness)
    ).checkRadioButton({ label: "Yes, wouldn't miss it" });
    await fixture.whenStable();
    expect(text()).toContain("We'd love you to stay at the venue");
  });

  it("is read-only after the deadline", async () => {
    await setup(makeGroup({ rsvpDeadline: PAST }));
    expect(text()).toContain("RSVPs closed on");
    expect(text()).not.toContain("Change my RSVP");
    expect((fixture.nativeElement as HTMLElement).querySelector("button[type=submit]")).toBeNull();
  });
});
