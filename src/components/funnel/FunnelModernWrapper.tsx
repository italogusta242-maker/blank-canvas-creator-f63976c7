import { Suspense, useEffect } from "react";
import { useFunnelStore } from "@/stores/useFunnelStore";
import FunnelModern from "./FunnelModern";

const FunnelModernWrapper = () => {
  const goTo = useFunnelStore((s) => s.goTo);
  const restoreCheckout = useFunnelStore((s) => s.restoreCheckout);

  useEffect(() => {
    // Ensure we are on the modern step for this route
    goTo("modern");
    restoreCheckout();
  }, [goTo, restoreCheckout]);

  useEffect(() => {
    // Enable scrolling for this version
    document.body.style.overflow = "auto";
    return () => {
      // Restore default if needed
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={<div className="h-screen w-full flex items-center justify-center bg-background"><div className="w-8 h-8 border-2 border-primary border-t-transparent animate-spin rounded-full" /></div>}>
        <FunnelModern />
      </Suspense>
    </div>
  );
};

export default FunnelModernWrapper;
