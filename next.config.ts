import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The PDF renderer is a Node library with its own font handling. Bundling it
  // breaks that, so it is loaded from node_modules at runtime instead.
  serverExternalPackages: ["@react-pdf/renderer"],

  images: {
    formats: ["image/avif", "image/webp"],

    /*
      No stored photograph is wider than 2000 pixels, so a 3840 wide entry in
      every srcset only ever produced a copy of the largest size under another
      name. Dropping it takes an entry off all thirty five images on the home
      page and stops the optimiser doing the work twice.
    */
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [32, 48, 64, 96, 128, 256, 384],

    // Every quality the site asks for. Anything else is refused rather than
    // silently filling the cache with a second copy of every picture.
    qualities: [75],

    /*
      Uploaded files are named with a UUID, so a given URL never changes what it
      points at and an optimised copy can be kept for a long time. Without this
      the copies expire within the minute and a page of photographs pays for the
      whole resizing job again on the next visit.
    */
    minimumCacheTTL: 2678400,
  },
};

export default nextConfig;
