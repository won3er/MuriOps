"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  isPublicPath,
  localeFromPathname,
  localizedPath,
  stripLocale,
  type Locale,
} from "@/lib/i18n";

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  href: (path: string) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const locale =
    localeFromPathname(pathname) ?? initialLocale ?? DEFAULT_LOCALE;

  const setLocale = useCallback(
    (nextLocale: Locale) => {
      document.cookie = `${LOCALE_COOKIE}=${nextLocale}; Path=/; Max-Age=31536000; SameSite=Lax`;

      const routeLocale = localeFromPathname(pathname);
      if (routeLocale) {
        router.push(localizedPath(nextLocale, stripLocale(pathname)));
        return;
      }

      if (isPublicPath(pathname)) {
        router.push(localizedPath(nextLocale, pathname));
        return;
      }

      router.refresh();
    },
    [pathname, router],
  );

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      setLocale,
      href: (path) => localizedPath(locale, path),
    }),
    [locale, setLocale],
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error("useLocale must be used inside LocaleProvider");
  }
  return context;
}
