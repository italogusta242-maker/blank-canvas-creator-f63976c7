import { lazy, Suspense, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useFunnelStore, type FunnelStep } from "@/stores/useFunnelStore";

const FunnelVSL = lazy(() => import("./FunnelVSL"));
const FunnelCadastro = lazy(() => import("./FunnelCadastro"));
const FunnelPlanos = lazy(() => import("./FunnelPlanos"));
const FunnelMembros = lazy(() => import("./FunnelMembros"));
const FunnelModern = lazy(() => import("./FunnelModern"));

const STEP_COMPONENTS: Record<FunnelStep, React.LazyExoticComponent<React.ComponentType>> = {
  modern: FunnelModern,
  vsl: FunnelVSL,
  cadastro: FunnelCadastro,
  planos: FunnelPlanos,
  membros: FunnelMembros,
};

const StepSkeleton = () => (
  <div className="w-full h-full flex items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 rounded-full border-2 border-t-transparent border-muted-foreground/20 animate-spin" />
      <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-muted-foreground/30 rounded-full animate-loading-bar" />
      </div>
    </div>
  </div>
);

const pageVariants = {
  initial: { opacity: 0, scale: 0.98 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 1.02 },
};

const FunnelWrapper = () => {
  const step = useFunnelStore((s) => s.step);
  const restoreCheckout = useFunnelStore((s) => s.restoreCheckout);

  useEffect(() => {
    restoreCheckout();
  }, [restoreCheckout]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const StepComponent = STEP_COMPONENTS[step];

  return (
    <div
      className="funnel-container bg-background"
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100dvh",
        overflow: "hidden",
        zIndex: 9999,
      }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="w-full h-full"
        >
          <Suspense fallback={<StepSkeleton />}>
            <StepComponent />
          </Suspense>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default FunnelWrapper;
