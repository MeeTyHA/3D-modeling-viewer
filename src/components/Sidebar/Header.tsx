"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import Image from "next/image";
import { FaHome, FaEnvelope } from "react-icons/fa";

const WHATSAPP_URL = "https://wa.me/message/CIIWE4C4LVA2L1";

function useIsClient() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

function HeaderShell() {
  return (
    <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between px-4 py-2.5 lg:px-8">
        <div className="h-11 w-[200px] shrink-0 sm:h-12" aria-hidden />
        <div className="flex items-center gap-1" aria-hidden>
          <div className="h-10 w-14 rounded-lg" />
          <div className="h-10 w-14 rounded-lg" />
        </div>
      </div>
    </header>
  );
}

export default function Header() {
  const isClient = useIsClient();

  const navItems = [
    { href: "/", label: "Inicio", icon: FaHome, external: false },
    { href: WHATSAPP_URL, label: "Contacto", icon: FaEnvelope, external: true },
  ];

  if (!isClient) {
    return <HeaderShell />;
  }

  return (
    <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between px-4 py-2.5 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center">
          <Image
            src="/assets/images/directrack-logo.png"
            alt="DirectTrack — Control Vehicular y Personal"
            width={200}
            height={56}
            className="h-11 w-auto object-contain sm:h-12"
            priority
          />
        </Link>

        <nav className="flex items-center gap-1" aria-label="Navegación principal">
          {navItems.map((item) => {
            const Icon = item.icon;
            const className =
              "flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 text-xs text-gray-500 transition-colors hover:text-[#1a3a5c]";

            if (item.external) {
              return (
                <a
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={className}
                >
                  <Icon className="text-base" />
                  {item.label}
                </a>
              );
            }

            return (
              <Link key={item.label} href={item.href} className={className}>
                <Icon className="text-base" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
