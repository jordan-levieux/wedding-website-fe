import { TestbedHarnessEnvironment } from "@angular/cdk/testing/testbed";
import { Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { MatButtonHarness } from "@angular/material/button/testing";
import { MatCheckboxHarness } from "@angular/material/checkbox/testing";
import { MatInputHarness, MatNativeSelectHarness } from "@angular/material/input/testing";
import { Router } from "@angular/router";
import { adminApi, adminGuest, setupAdminPage } from "../admin-testing";
import { AddGuestPage } from "./add-guest-page";

@Component({ template: "" })
class Blank {}

const GUESTS = [
  adminGuest({}),
  adminGuest({ guestId: 2, groupId: 2, name: "Carl", surname: "Botha" }),
];

const selectedGroup = async (select: MatNativeSelectHarness) =>
  (await select.getOptions({ isSelected: true }))[0].getText();

describe("AddGuestPage", () => {
  const open = async (url: string) => {
    const page = await setupAdminPage(
      ["admin"],
      [
        { path: "admin/guests/new", component: AddGuestPage },
        { path: "admin/guests/:guestId", component: Blank },
      ],
      url,
    );
    page.http.expectOne(`${adminApi}/guests`).flush(GUESTS);
    await page.settle();
    return { ...page, loader: TestbedHarnessEnvironment.loader(page.harness.fixture) };
  };

  it("adds a guest to the group from the URL and opens their page", async () => {
    const { loader, http, settle } = await open("/admin/guests/new?group=2");
    const group = await loader.getHarness(MatNativeSelectHarness);
    expect(await (await group.getOptions())[0].getText()).toBe("A new group of their own");
    expect(await selectedGroup(group)).toBe("Carl Botha");

    const [name, surname] = await loader.getAllHarnesses(MatInputHarness);
    await name.setValue(" Dineo ");
    await surname.setValue("Botha");
    await (await loader.getHarness(MatCheckboxHarness.with({ label: "Venue stay" }))).check();
    await (await loader.getHarness(MatButtonHarness.with({ text: /Add guest/ }))).click();

    const request = http.expectOne(`${adminApi}/guests`);
    expect(request.request.method).toBe("POST");
    expect(request.request.body).toEqual({
      groupId: 2,
      name: "Dineo",
      surname: "Botha",
      roles: ["venue_accommodation"],
    });
    request.flush(adminGuest({ guestId: 3, groupId: 2, name: "Dineo", surname: "Botha" }));
    await settle();
    expect(TestBed.inject(Router).url).toBe("/admin/guests/3");
  });

  it("puts guests in a new group of their own by default, and needs both names", async () => {
    const { loader, http, text } = await open("/admin/guests/new");
    expect(await selectedGroup(await loader.getHarness(MatNativeSelectHarness))).toBe(
      "A new group of their own",
    );
    await (await loader.getHarness(MatButtonHarness.with({ text: /Add guest/ }))).click();
    expect(text()).toContain("Required");
    http.expectNone({ method: "POST", url: `${adminApi}/guests` });

    const [name, surname] = await loader.getAllHarnesses(MatInputHarness);
    await name.setValue("Dineo");
    await surname.setValue("Botha");
    await (await loader.getHarness(MatButtonHarness.with({ text: /Add guest/ }))).click();
    expect(http.expectOne(`${adminApi}/guests`).request.body).toEqual(
      expect.objectContaining({ groupId: null, roles: [] }),
    );
  });
});
