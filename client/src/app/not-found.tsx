"use client";
import dynamic from "next/dynamic";
import notFoundAnimation from "@/assets/404nf.json";

// lottie-react touches `document` on import, which breaks SSR/prerender.
// Load it client-side only via a dynamic import with SSR disabled.
const Lottie = dynamic(() => import("lottie-react").then((mod) => mod.default), {
  ssr: false,
});

const NotFoundPage = () => {
  return (
    <div className="grid place-items-center min-h-[120vh] p-20">
      <div className="w-[35%]">
        <Lottie animationData={notFoundAnimation} loop={true} />
        {/* <dotlottie-player
          autoplay
          loop
          playMode="normal"
          src="/404nf.json"
        ></dotlottie-player> */}
        {/* <Lottie animationData={'/404nf.json'} loop={true} /> */}
      </div>
    </div>
  );
};

export default NotFoundPage;
