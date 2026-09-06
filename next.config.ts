import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The PDF renderer is a Node library with its own font handling. Bundling it
  // breaks that, so it is loaded from node_modules at runtime instead.
  serverExternalPackages: ["@react-pdf/renderer"],

  // Uploaded and generated files must never be guessable from a cached copy in
  // a shared proxy, and the framework should not try to optimise a PDF.
  images: {
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
