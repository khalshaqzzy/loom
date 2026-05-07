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

      const scroller = root.current?.querySelector<HTMLElement>(".landing-page");
      if (!scroller) return;
      const hoverCleanups: Array<() => void> = [];

      const heroTimeline = gsap.timeline({ defaults: { ease: "power3.out" } });
      heroTimeline
        .from(".landing-nav", { y: -18, opacity: 0, duration: 1.05 })
        .from(".hero-copy > *", { y: 28, opacity: 0, duration: 1.08, stagger: 0.11 }, "-=0.48")
        .from(".hero-map", { x: 40, y: 16, opacity: 0, scale: 0.96, duration: 1.18 }, "-=0.72")
        .from(".hero-phone", { y: 32, opacity: 0, scale: 0.94, duration: 1.12 }, "-=0.78")
        .from(".hero-overview-card", { y: 28, opacity: 0, duration: 0.95 }, "-=0.62");

      gsap.utils.toArray<HTMLElement>(".landing-stage").forEach((section) => {
        const revealItems = section.querySelectorAll<HTMLElement>(
          [
            ".section-kicker",
            ".preview-copy",
            ".mesh-left > h2",
            ".mesh-left > p",
            ".secure-callout",
            ".section-surface > h2",
            ".surface-intro",
            ".section-lifecycle > h2",
            ".lifecycle-sub",
            ".lifecycle-intro",
            ".section-privacy > h2",
            ".privacy-intro",
            ".privacy-bar",
            ".cta-content > *",
            ".footer-brand",
            ".footer-column",
            ".footer-privacy",
            ".footer-bottom"
          ].join(", ")
        );

        if (!revealItems.length) return;

        gsap.fromTo(
          revealItems,
          { y: 26, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 1.05,
            stagger: 0.075,
            ease: "power3.out",
            scrollTrigger: {
              trigger: section,
              scroller,
              start: "top 72%",
              toggleActions: "play none none reverse"
            }
          }
        );
      });

      gsap.utils
        .toArray<HTMLElement>(
          ".preview-card, .public-surface-card, .admin-surface-card, .lifecycle-card, .privacy-visual-tile, .privacy-card"
        )
        .forEach((element) => {
          gsap.fromTo(
            element,
            { y: 34, opacity: 0, scale: 0.985 },
            {
              y: 0,
              opacity: 1,
              scale: 1,
              duration: 1.15,
              ease: "power3.out",
              scrollTrigger: {
                trigger: element,
                scroller,
                start: "top 88%",
                toggleActions: "play none none reverse"
              }
            }
          );
        });

      gsap.utils
        .toArray<HTMLElement>(
          ".preview-card, .mesh-step, .public-surface-card, .admin-surface-card, .lifecycle-card, .privacy-visual-tile, .privacy-card, .hero-overview-card"
        )
        .forEach((element) => {
          const media = element.querySelectorAll<HTMLElement>(
            "img, .mesh-step-icon, .privacy-icon, .card-number, .feature-line > span, .admin-row > span"
          );
          const enter = () => {
            gsap.to(element, {
              y: -6,
              scale: 1.012,
              duration: 0.42,
              ease: "power2.out",
              overwrite: "auto"
            });
            if (media.length) {
              gsap.to(media, {
                scale: 1.035,
                duration: 0.62,
                ease: "power2.out",
                overwrite: "auto"
              });
            }
          };
          const leave = () => {
            gsap.to(element, {
              y: 0,
              scale: 1,
              duration: 0.64,
              ease: "power2.out",
              overwrite: "auto"
            });
            if (media.length) {
              gsap.to(media, {
                scale: 1,
                duration: 0.7,
                ease: "power2.out",
                overwrite: "auto"
              });
            }
          };

          element.addEventListener("pointerenter", enter);
          element.addEventListener("pointerleave", leave);
          element.addEventListener("focusin", enter);
          element.addEventListener("focusout", leave);
          hoverCleanups.push(() => {
            element.removeEventListener("pointerenter", enter);
            element.removeEventListener("pointerleave", leave);
            element.removeEventListener("focusin", enter);
            element.removeEventListener("focusout", leave);
          });
        });

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
              scroller,
              start: "top 82%",
              end: "bottom 45%",
              scrub: true
            }
          }
        );
      });

      gsap.utils
        .toArray<HTMLElement>(
          ".preview-map-img, .full-img, .surface-map-img, .lifecycle-img, .privacy-visual-tile img, .cta-map-img"
        )
        .forEach((element) => {
          gsap.fromTo(
            element,
            { scale: 1.04 },
            {
              scale: 1,
              ease: "none",
              scrollTrigger: {
                trigger: element.closest(".landing-stage") ?? element,
                scroller,
                start: "top bottom",
                end: "bottom top",
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
          scroller,
          start: "top top+=100",
          end: "bottom bottom",
          pin: pinnedTitle,
          pinSpacing: false
        });
      }

      ScrollTrigger.refresh();

      return () => {
        hoverCleanups.forEach((cleanup) => cleanup());
      };
    },
    { scope: root }
  );

  return <div ref={root}>{children}</div>;
}
