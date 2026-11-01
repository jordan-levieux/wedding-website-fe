import { TestBed } from "@angular/core/testing";
import { ScrollCue } from "./scroll-cue";

describe("ScrollCue", () => {
  const click = async (reduceMotion: boolean) => {
    vi.stubGlobal("matchMedia", () => ({ matches: reduceMotion }));
    const target = document.createElement("main");
    target.scrollIntoView = vi.fn();
    const fixture = TestBed.createComponent(ScrollCue);
    fixture.componentRef.setInput("target", target);
    await fixture.whenStable();
    (fixture.nativeElement as HTMLElement).querySelector("button")!.click();
    vi.unstubAllGlobals();
    return target.scrollIntoView;
  };

  it("scrolls smoothly down to the content", async () => {
    expect(await click(false)).toHaveBeenCalledWith({ behavior: "smooth" });
  });

  it("jumps straight there for people who prefer less motion", async () => {
    expect(await click(true)).toHaveBeenCalledWith({ behavior: "auto" });
  });
});
