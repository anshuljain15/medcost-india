/**
 * The GitHub Pages basePath ("/medcost-india" under
 * NEXT_PUBLIC_DEPLOY_TARGET=static, "" on Vercel). next/link and next/image
 * add it themselves; this is for the few places that build a URL by hand:
 * static JSON fetches (lib/staticData.ts), shared links (ShareButton) and the
 * map popups' hrefs (HospitalMap). next.config.ts should read it from here too,
 * so a rename happens in one place.
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_DEPLOY_TARGET === "static" ? "/medcost-india" : "";
