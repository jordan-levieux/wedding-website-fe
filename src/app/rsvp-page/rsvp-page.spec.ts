import { HarnessLoader } from "@angular/cdk/testing";
import { TestbedHarnessEnvironment } from "@angular/cdk/testing/testbed";
import { provideHttpClient } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { MatExpansionPanelHarness } from "@angular/material/expansion/testing";
import { MatButtonToggleGroupHarness } from "@angular/material/button-toggle/testing";
import { MatChipListboxHarness } from "@angular/material/chips/testing";
import { environment } from "../../environments/environment";
import { Group, Rsvp } from "../models/api";
import { GoogleMapsLoader } from "../services/googleMapsLoader";
import { GroupService } from "../services/groupService";
import { RsvpPage } from "./rsvp-page";

const FUTURE = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
const PAST = new Date(Date.now() - 1000).toISOString();

const aliceAnswer: Rsvp = {
  attending: true,
  dietary: "none",
  dietaryOtherDetails: null,
  shuttle: true,
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
  accommodation: null,
  guests: [
    { guestId: 1, name: "Alice", surname: "Smith", rsvp: aliceRsvp, ownAccommodation: null },
    { guestId: 2, name: "Bob", surname: "Smith", rsvp: null, ownAccommodation: null },
    { guestId: 3, name: "Cleo", surname: "Smith", rsvp: null, ownAccommodation: null },
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
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: GoogleMapsLoader, useValue: { available: false } },
      ],
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
  const button = (label: string) =>
    [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>("button")].find(
      (candidate) => candidate.textContent!.trim().endsWith(label),
    )!;

  afterEach(() => http.verify());

  it("asks for their own RSVP before showing the rest of the group", async () => {
    await setup(makeGroup({}, null));
    expect(text()).toContain("Hi Alice");
    expect(forms()).toHaveLength(1);
    expect(text()).not.toContain("Your group");
  });

  it("once they've answered, lists the group with the next person to answer opened", async () => {
    await setup(makeGroup());
    expect(text()).toContain("You're coming, hooray!");
    expect(text()).toContain("Taking the shuttle");
    expect(text()).toContain("1 of 3 in your group have replied");
    const panels = await loader.getAllHarnesses(MatExpansionPanelHarness);
    const titles = await Promise.all(panels.map((panel) => panel.getTitle()));
    expect(titles[0]).toMatch(/^Bob Smith.*Not replied$/);
    expect(titles[1]).toMatch(/^Cleo Smith.*Not replied$/);
    expect(await Promise.all(panels.map((panel) => panel.isExpanded()))).toEqual([true, false]);
  });

  it("saves someone else's RSVP with the copied shuttle answer", async () => {
    await setup(makeGroup());
    const bobPanel = (await loader.getAllHarnesses(MatExpansionPanelHarness))[0]!;
    const [accept] = await (
      await bobPanel.getHarness(MatButtonToggleGroupHarness)
    ).getToggles({ text: "Joyfully accept" });
    await accept!.check();
    await (await bobPanel.getHarness(MatChipListboxHarness)).selectChips({ text: "Vegetarian" });

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
        },
      ],
    });
    const updated = makeGroup({ accommodation: { lat: -33.95, lng: 22.46 } });
    updated.guests[1]!.rsvp = { ...aliceAnswer, dietary: "vegetarian" };
    request.flush(updated);
    await fixture.whenStable();

    const panels = await loader.getAllHarnesses(MatExpansionPanelHarness);
    expect(await panels[0]!.getTitle()).toMatch(/^Bob Smith.*Coming$/);
    expect(await panels[1]!.isExpanded()).toBe(true);
  });

  it("asks where the group is staying once someone is coming", async () => {
    await setup(makeGroup({}, null));
    expect(text()).not.toContain("Where is your group staying?");
    groupService.setGroup(makeGroup({ roles: ["venue_accommodation"] }));
    await fixture.whenStable();
    expect(text()).toContain("Where is your group staying?");
    expect(text()).toContain("We'd love you to stay at the venue");
    expect(text()).toContain("Anyone staying somewhere else?");
  });

  it("is read-only after the deadline, apart from where people are staying", async () => {
    await setup(makeGroup({ rsvpDeadline: PAST, accommodation: { lat: -33.95, lng: 22.46 } }));
    expect(text()).toContain("RSVPs closed on");
    expect(text()).not.toContain("Change my RSVP");
    expect((fixture.nativeElement as HTMLElement).querySelector("button[type=submit]")).toBeNull();

    button("Change").click();
    await fixture.whenStable();
    button("Clear").click();
    await fixture.whenStable();
    button("Remove location").click();
    const request = http.expectOne(`${environment.apiUrl}/accommodation`);
    expect(request.request.method).toBe("PUT");
    expect(request.request.body).toEqual({ accommodation: null });
    request.flush(makeGroup({ rsvpDeadline: PAST }));
  });

  it("puts someone staying somewhere else back with the group", async () => {
    const group = makeGroup({ accommodation: { lat: -33.95, lng: 22.46 } });
    group.guests[1]!.ownAccommodation = { lat: -33.99, lng: 22.58 };
    await setup(group);
    const bob = [...(fixture.nativeElement as HTMLElement).querySelectorAll(".member")][1]!;
    expect(bob.textContent).toContain("Bob Smith");
    expect(bob.textContent).toContain("Staying somewhere else");

    [...bob.querySelectorAll("button")]
      .find((b) => b.textContent!.includes("Back with the group"))!
      .click();
    const request = http.expectOne(`${environment.apiUrl}/accommodation/2`);
    expect(request.request.body).toEqual({ accommodation: null });
    request.flush(makeGroup({ accommodation: { lat: -33.95, lng: 22.46 } }));
    await fixture.whenStable();
    expect(
      (fixture.nativeElement as HTMLElement).querySelectorAll(".member")[1]!.textContent,
    ).toContain("With the group");
  });
});
