import { signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { App } from "./app";
import { AuthService } from "./services/authService";
import { GroupService } from "./services/groupService";

describe("App RSVP tab indicator", () => {
  const render = async (attention: { unanswered: number; incomplete: number }, rsvpOpen = true) => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { accessToken: signal("token") } },
        {
          provide: GroupService,
          useValue: {
            attention: signal(attention),
            rsvpOpen: signal(rsvpOpen),
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
});
