import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Solo dev (docker/OrbStack). `*` no cubre el dominio raíz.
  allowedDevOrigins: ["bioteam.local", "*.bioteam.local"],
};

export default nextConfig;
