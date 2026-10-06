import { useEffect, useState } from "react";
import { getPlatformConfig } from "utils/platform";

/** A small tab at the top of every page in the demonstration environment. It never affects page layout. */
export default function DemoBanner() {
  const [demo, setDemo] = useState(false);
  useEffect(() => {
    let live = true;
    getPlatformConfig().then((c) => live && setDemo(c.demo_mode));
    return () => {
      live = false;
    };
  }, []);
  if (!demo) return null;
  return (
    <div
      role="note"
      className="pointer-events-none fixed left-1/2 top-0 z-[2147483000] -translate-x-1/2 whitespace-nowrap rounded-b-md bg-slate-900/95 px-3 text-[10px] font-semibold leading-[14px] tracking-wide text-amber-300"
    >
      Demonstration: simulated money
    </div>
  );
}
