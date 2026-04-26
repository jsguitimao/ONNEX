"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { Pause, Play } from "lucide-react";

type Props = {
  src: string;
  ariaLabel: string;
  posterUrl?: string | null;
};

const REDUCE_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReduceMotion(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  const mq = window.matchMedia(REDUCE_MOTION_QUERY);
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

function getReduceMotionSnapshot() {
  if (typeof window === "undefined") return false;
  return window.matchMedia(REDUCE_MOTION_QUERY).matches;
}

function getServerSnapshot() {
  return false;
}

export function HeroVideo({ src, ariaLabel, posterUrl }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const reduceMotion = useSyncExternalStore(
    subscribeReduceMotion,
    getReduceMotionSnapshot,
    getServerSnapshot,
  );
  const shouldAutoplay = !reduceMotion;
  const [isPlaying, setIsPlaying] = useState(true);

  const toggle = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  return (
    <>
      <video
        ref={videoRef}
        src={src}
        poster={posterUrl ?? undefined}
        className="h-full w-full object-cover"
        autoPlay={shouldAutoplay}
        muted
        loop
        playsInline
        preload="metadata"
        aria-label={ariaLabel}
      />
      <button
        type="button"
        onClick={toggle}
        aria-label={isPlaying ? "Pausar vídeo" : "Reproduzir vídeo"}
        className="absolute bottom-4 right-4 z-10 flex size-10 items-center justify-center rounded-full border border-white/20 bg-black/50 text-white backdrop-blur-sm transition hover:bg-black/70"
      >
        {isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
      </button>
    </>
  );
}
