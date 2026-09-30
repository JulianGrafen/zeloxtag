/** Whether the app-wide Impressum/Datenschutz footer should render under page content. */
export function showGlobalLegalFooter(pathname: string): boolean {
  if (pathname === "/" || pathname.startsWith("/login")) return false;
  if (
    pathname === "/impressum" ||
    pathname === "/agb" ||
    pathname === "/datenschutz"
  ) {
    return false;
  }
  return true;
}

export function shouldRenderGlobalLegalFooter(input: {
  pathname: string;
  publicShowcase: boolean;
  scanQueryActive: boolean;
  scanSurfaceActive: boolean;
}): boolean {
  if (!showGlobalLegalFooter(input.pathname)) return false;
  if (input.publicShowcase) return false;
  if (input.scanQueryActive || input.scanSurfaceActive) return false;
  return true;
}
