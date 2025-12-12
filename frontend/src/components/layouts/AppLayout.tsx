import { Sidebar } from "../Sidebar";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export const AppLayout = ({ children, className }: AppLayoutProps) => {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <Sidebar />
      <main className={cn(
        "flex-1 overflow-hidden",
        className
      )}>
        {children}
      </main>
    </div>
  );
};
