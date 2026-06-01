import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.laststicker.com",
        pathname: "/i/cards/12176/**"
      }
    ]
  }
};

export default nextConfig;
