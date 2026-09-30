/** Whether the app-wide Impressum/Datenschutz footer should render under page content. */
function isImmersiveVehicleSurface(pathname: string): boolean {
  if (pathname.endsWith("/entdecken")) return true;
  if (pathname.startsWith("/claim/")) return true;
  if (pathname === "/register") return true;
  return false;
}

export function showGlobalLegalFooter(pathname: string): boolean {
  if (pathname === "/" || pathname.startsWith("/login")) return false;
  if (isImmersiveVehicleSurface(pathname)) return false;
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
