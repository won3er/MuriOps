import { NextRequest, NextResponse } from "next/server";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  isPublicPath,
  localeFromPathname,
  stripLocale,
} from "@/lib/i18n";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!isPublicPath(pathname)) return NextResponse.next();

  const routeLocale = localeFromPathname(pathname);
  if (routeLocale === DEFAULT_LOCALE) {
    const url = request.nextUrl.clone();
    url.pathname = stripLocale(pathname);
    return NextResponse.redirect(url, 307);
  }

  const locale = routeLocale ?? DEFAULT_LOCALE;
  const cleanPath = routeLocale ? stripLocale(pathname) : pathname;
  const url = request.nextUrl.clone();
  url.pathname = cleanPath;

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-muriops-locale", locale);
  requestHeaders.set("x-muriops-public-path", cleanPath);

  const response = NextResponse.rewrite(url, {
    request: { headers: requestHeaders },
  });
  response.cookies.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  response.headers.set("Content-Language", locale);
  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
