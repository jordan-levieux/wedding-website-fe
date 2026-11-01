import { Component, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { provideRouter, Router } from "@angular/router";
import { App } from "./app";
import { AuthService } from "./services/authService";
import { GroupService } from "./services/groupService";

@Component({ template: "" })
class Blank {}

describe("App tabs", () => {
  const render = async (
    attention: { unanswered: number; incomplete: number },
    rsvpOpen = true,
    canSeeAdmin = false,
  ) => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: "home", component: Blank },
          { path: "info", component: Blank },
        ]),
        { provide: AuthService, useValue: { accessToken: signal("token") } },
        {
          provide: GroupService,
          useValue: {
            attention: signal(attention),
            rsvpOpen: signal(rsvpOpen),
            canSeeAdmin: signal(canSeeAdmin),
            self: signal({ guestId: 1, name: "Alice", surname: "Smith", rsvp: null }),
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  };

  it("counts people who haven't answered, in the urgent style", async () => {
    const element = await render({ unanswered: 2, incomplete: 1 });
    expect(element.querySelector(".mat-badge-content")?.textContent?.trim()).toBe("3");
    expect(element.querySelector(".urgent")).not.toBeNull();
  });

  it("uses the softer style when only optional answers are missing", async () => {
    const element = await render({ unanswered: 0, incomplete: 1 });
    expect(element.querySelector(".reminder .mat-badge-content")?.textContent?.trim()).toBe("1");
  });

  it("disappears when everything is answered or RSVPs have closed", async () => {
    expect(
      (await render({ unanswered: 0, incomplete: 0 })).querySelector(".mat-badge-content"),
    ).toBeNull();
    TestBed.resetTestingModule();
    expect(
      (await render({ unanswered: 2, incomplete: 0 }, false)).querySelector(".mat-badge-content"),
    ).toBeNull();
  });

  it("shows the admin tab only to admins and viewers", async () => {
    const tabs = (element: HTMLElement) =>
      [...element.querySelectorAll("[mat-tab-link]")].map((tab) => tab.textContent?.trim());
    expect(tabs(await render({ unanswered: 0, incomplete: 0 }))).toEqual(["Home", "RSVP", "Info"]);
    TestBed.resetTestingModule();
    expect(tabs(await render({ unanswered: 0, incomplete: 0 }, true, true))).toEqual([
      "Home",
      "RSVP",
      "Info",
      "Admin",
    ]);
  });

  it("scrolls back to the top on moving to another page, but not for a query change", async () => {
    await render({ unanswered: 0, incomplete: 0 });
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    const router = TestBed.inject(Router);
    await router.navigateByUrl("/home");
    await router.navigateByUrl("/home?q=x");
    expect(scrollTo).not.toHaveBeenCalled();
    await router.navigateByUrl("/info");
    expect(scrollTo).toHaveBeenCalledWith(0, 0);
  });
});
