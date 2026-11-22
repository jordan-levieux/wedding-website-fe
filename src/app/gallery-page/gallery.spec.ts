import { albumPhotos } from "./gallery";

const photo = (name: string, extra: { alt?: string; caption?: string } = {}) => ({
  name,
  url: `https://signed/${name}`,
  alt: extra.alt ?? null,
  caption: extra.caption ?? null,
});

describe("albumPhotos", () => {
  it("pairs each display copy with its thumbnail, in file name order", () => {
    const { "forest-floor": forest } = albumPhotos({
      photos: [
        photo("artistry_of_the_forest_floor/display/10_ferns.jpg"),
        photo("artistry_of_the_forest_floor/thumbs/10_ferns.webp"),
        photo("artistry_of_the_forest_floor/display/2-orange_fungus.jpg", {
          caption: "Knysna",
        }),
        photo("artistry_of_the_forest_floor/thumbs/2-orange_fungus.webp"),
        // a thumbnail on its own has nothing to open, so it's left out
        photo("artistry_of_the_forest_floor/thumbs/orphan.webp"),
      ],
    });
    expect(forest).toEqual([
      {
        src: "https://signed/artistry_of_the_forest_floor/display/2-orange_fungus.jpg",
        thumb: "https://signed/artistry_of_the_forest_floor/thumbs/2-orange_fungus.webp",
        alt: "Orange fungus",
        caption: "Knysna",
      },
      {
        src: "https://signed/artistry_of_the_forest_floor/display/10_ferns.jpg",
        thumb: "https://signed/artistry_of_the_forest_floor/thumbs/10_ferns.webp",
        alt: "Ferns",
        caption: null,
      },
    ]);
  });

  it("uses a photo put straight in the album's folder for both, with alt text from metadata", () => {
    const { us, "forest-floor": forest } = albumPhotos({
      photos: [
        photo("hyla_and_jordan/IMG 0042.jpg", { alt: "Hyla and Jordan on a mountain" }),
        photo("somewhere_else/photo.jpg"),
      ],
    });
    expect(us).toEqual([
      {
        src: "https://signed/hyla_and_jordan/IMG 0042.jpg",
        thumb: "https://signed/hyla_and_jordan/IMG 0042.jpg",
        alt: "Hyla and Jordan on a mountain",
        caption: null,
      },
    ]);
    expect(forest).toEqual([]);
  });

  it("copes with an empty gallery", () => {
    expect(albumPhotos({ photos: [] })).toEqual({ "forest-floor": [], us: [] });
  });
});
