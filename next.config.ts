import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Pins the workspace root explicitly — without this, Turbopack searches
  // upward for a lockfile and can pick up an unrelated one outside this
  // repo (e.g. in a parent user-profile directory), which triggers a
  // confusing "ignored package-lock.json" warning at build time.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
