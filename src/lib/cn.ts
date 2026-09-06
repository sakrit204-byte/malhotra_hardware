import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * The type sizes this project adds to the theme.
 *
 * Tailwind generates a utility for every size in the theme, but the merge step
 * cannot know whether `text-title` means a size or a colour. Left to guess it
 * treats the two as the same kind of class and drops one of them, which is a
 * silent failure: the heading simply comes out at body size. Naming them here
 * is what keeps `cn("text-title", "text-ink")` meaning both.
 */
const fontSizes = ["display", "title", "note"];

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: fontSizes }],
    },
  },
});

/** Joins class names and lets a caller override a component default. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
