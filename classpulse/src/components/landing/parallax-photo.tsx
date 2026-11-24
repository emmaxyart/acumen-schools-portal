"use client";

import Image from "next/image";
import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

/** Full-width hero photo with a subtle scroll-linked parallax drift. */
export default function ParallaxPhoto() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "16%"]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.08]);

  return (
    <div ref={ref} aria-hidden="true" className="absolute inset-0 -z-20 overflow-hidden">
      <motion.div style={{ y, scale }} className="absolute inset-0">
        <Image
          src="/school-poster.png"
          alt=""
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 1280px"
          className="h-full w-full object-cover object-[center_28%] opacity-80"
        />
      </motion.div>
    </div>
  );
}
