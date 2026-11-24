export type Photo = {
  // the full-screen version, and a smaller one for the grid and album covers
  src: string;
  thumb: string;
  // what's in the photo, for screen readers
  alt: string;
  caption: string | null;
};

export type Album = {
  // also the ?album= value in the page's address
  id: string;
  // the album's folder in the gallery bucket
  folder: string;
  title: string;
  intro: string;
};

export const ALBUMS: Album[] = [
  {
    id: "forest-floor",
    folder: "artistry_of_the_forest_floor",
    title: "The Artistry of the Forest Floor",
    intro:
      "The moss, mushrooms, lichen and light we keep stopping to look at, and the photographs that inspired our theme.",
  },
  {
    id: "us",
    folder: "hyla_and_jordan",
    title: "Hyla and Jordan",
    intro: "Some of our memories and the future home of some wedding pics",
  },
];

// GET /gallery: every image in the private gallery bucket, each with a signed link that expires
export type GalleryResponse = {
  photos: { name: string; url: string; alt: string | null; caption: string | null }[];
};

// "03_orange-fungus.jpg" reads as "Orange fungus"; the leading number is only there to order the photos
const nameToText = (fileName: string) => {
  const text = fileName
    .replace(/\.[^.]+$/, "")
    .replace(/^\d+[\s._-]*/, "")
    .replace(/[_-]+/g, " ")
    .trim();
  return text ? text[0]!.toUpperCase() + text.slice(1) : "Photo";
};

const baseName = (fileName: string) => fileName.replace(/\.[^.]+$/, "");

/**
 * Each album's photos, in file name order. scripts/prepare-gallery-photos.sh makes a display/ and a
 * thumbs/ copy of each photo, paired up by file name; a photo put straight in the album's folder is
 * used for both. Alt text comes from the file name unless the display copy has an `alt` custom
 * metadata entry, and an optional `caption` entry shows under the full-size photo.
 */
export const albumPhotos = ({ photos }: GalleryResponse): Record<string, Photo[]> =>
  Object.fromEntries(
    ALBUMS.map((album) => {
      const displays = new Map<string, GalleryResponse["photos"][number]>();
      const thumbs = new Map<string, string>();
      photos.forEach((photo) => {
        const [folder, ...rest] = photo.name.split("/");
        if (folder !== album.folder) {
          return;
        }
        const [subfolder, file] = rest.length === 2 ? rest : [null, rest.join("/")];
        if (subfolder === "thumbs") {
          thumbs.set(baseName(file!), photo.url);
        } else if (subfolder === "display" || subfolder === null) {
          displays.set(baseName(file!), photo);
        }
      });
      const names = [...displays.keys()].sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true }),
      );
      return [
        album.id,
        names.map((name) => {
          const display = displays.get(name)!;
          return {
            src: display.url,
            thumb: thumbs.get(name) ?? display.url,
            alt: display.alt ?? nameToText(name),
            caption: display.caption,
          };
        }),
      ];
    }),
  );
