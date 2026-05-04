"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useRef } from "react";

gsap.registerPlugin(ScrollTrigger);

export function LandingMotion({ children }: { children: React.ReactNode }) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduceMotion) return;

      gsap.utils.toArray<HTMLElement>("[data-scale-fade]").forEach((element) => {
        gsap.fromTo(
          element,
          { scale: 0.92, opacity: 0.55 },
          {
            scale: 1,
            opacity: 1,
            ease: "power2.out",
            scrollTrigger: {
              trigger: element,
              start: "top 82%",
              end: "bottom 45%",
              scrub: true
            }
          }
        );
      });

      const pinnedTitle = root.current?.querySelector("[data-pin-title]");
      const pinSection = root.current?.querySelector("[data-pin-section]");
      if (pinnedTitle && pinSection) {
        ScrollTrigger.create({
          trigger: pinSection,
          start: "top top+=100",
          end: "bottom bottom",
          pin: pinnedTitle,
          pinSpacing: false
        });
      }
    },
    { scope: root }
  );

  return <div ref={root}>{children}</div>;
}
