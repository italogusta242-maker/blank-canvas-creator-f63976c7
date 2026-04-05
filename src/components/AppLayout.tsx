import { Outlet, useLocation } from "react-router-dom";
import BottomNav from "./BottomNav";
import NotificationCenter from "@/components/NotificationCenter";
import PushPermissionBanner from "@/components/PushPermissionBanner";
import { usePushNotifications } from "@/hooks/usePushNotifications";

interface AppLayoutProps {
  dishonorMode: boolean;
  setDishonorMode: (v: boolean) => void;
}

const AppLayout = ({ dishonorMode, setDishonorMode }: AppLayoutProps) => {
  const { pushState, requestPermission, isInstallable, installPWA } = usePushNotifications();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PushPermissionBanner 
        pushState={pushState} 
        onRequestPermission={requestPermission} 
        isInstallable={isInstallable}
        onInstall={installPWA}
      />
      <main className="flex-1 pb-20">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
};

export default AppLayout;
