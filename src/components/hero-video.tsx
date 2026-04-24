"use client";

import { useEffect, useRef } from "react";

type Props = {
  src: string;
  ariaLabel: string;
};

export function HeroVideo({ src, ariaLabel }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    video.playsInline = true;

    const tryPlay = () => {
      const promise = video.play();
      if (promise !== undefined) {
        promise.catch(() => {
          // Browser blocked autoplay; user interaction will resume.
        });
      }
    };

    tryPlay();

    const onCanPlay = () => tryPlay();
    video.addEventListener("canplay", onCanPlay);

    return () => {
      video.removeEventListener("canplay", onCanPlay);
    };
  }, [src]);

  return (
    <video
      ref={videoRef}
      src={src}
      className="h-full w-full object-cover"
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      aria-label={ariaLabel}
    />
  );
}
