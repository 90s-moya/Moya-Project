"use client";

import { useEffect, useState } from "react";
import HomeIntroSection from "../home/HomeIntroSection";
import HomeInterviewSection from "../home/HomeInterviewSection";
import HomeStudySection from "../home/HomeStudySection";

export default function FullPageScroll() {
  const [vh, setVh] = useState<string>("100vh");

  useEffect(() => {
    const setActualHeight = () => {
      const vhValue = window.innerHeight * 0.01;
      setVh(`${vhValue * 100}px`);
    };

    setActualHeight();
    window.addEventListener("resize", setActualHeight);
    return () => window.removeEventListener("resize", setActualHeight);
  }, []);

  return (
    <div
      className="scroll-container scrollbar-hide"
      style={{
        height: "100vh",
        overflowY: "scroll",
        scrollSnapType: "y mandatory",
        scrollBehavior: "smooth",
      }}
    >
      {/* SECTION 1 */}
      <div
        className="section"
        style={{
          height: vh,
          scrollSnapAlign: "start",
          scrollSnapStop: "always",
        }}
      >
        <HomeIntroSection vh={vh} />
      </div>

      {/* SECTION 2 */}
      <div
        className="section"
        style={{
          height: vh,
          scrollSnapAlign: "start",
          scrollSnapStop: "always",
        }}
      >
        <HomeInterviewSection vh={vh} />
      </div>

      {/* SECTION 3 */}
      <div
        className="section"
        style={{
          height: vh,
          scrollSnapAlign: "start",
          scrollSnapStop: "always",
        }}
      >
        <HomeStudySection vh={vh} />
      </div>
    </div>
  );
}
