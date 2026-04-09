import { Outlet } from "react-router-dom";
import BottomNav from "./BottomNav";

interface AppLayoutProps {
  dishonorMode: boolean;
  setDishonorMode: (v: boolean) => void;
}

const AppLayout = ({ dishonorMode, setDishonorMode }: AppLayoutProps) => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 pb-20">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
};

export default AppLayout;
