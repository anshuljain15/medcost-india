import type { NextConfig } from "next";

const isStaticExport = process.env.NEXT_PUBLIC_DEPLOY_TARGET === "static";

const nextConfig: NextConfig = {
  ...(isStaticExport
    ? {
        output: "export",
        basePath: "/medcost-india",
        images: { unoptimized: true },
      }
    : {}),
};

export default nextConfig;
