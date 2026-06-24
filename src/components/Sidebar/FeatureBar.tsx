"use client";

import { FaWrench, FaHeadset, FaLaptop } from "react-icons/fa";

const features = [
  {
    icon: FaWrench,
    title: "Instalación profesional",
    subtitle: "Técnicos certificados",
  },
  {
    icon: FaHeadset,
    title: "Soporte 24/7",
    subtitle: "Atención en todo México",
  },
  {
    icon: FaLaptop,
    title: "Plataforma avanzada",
    subtitle: "Web y app móvil",
  },
];

export default function FeatureBar() {
  return (
    <div className="border-t border-gray-100 bg-white">
      <div className="mx-auto grid max-w-[1600px] grid-cols-1 gap-4 px-4 py-4 sm:grid-cols-3 lg:px-8">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <div key={feature.title} className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50">
                <Icon className="text-[#1e88e5]" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#1a3a5c] sm:text-sm">
                  {feature.title}
                </p>
                <p className="text-[10px] text-gray-500 sm:text-xs">
                  {feature.subtitle}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
