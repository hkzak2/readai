import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Index from "@/pages/Index";
import Library from "@/pages/Library";
import Home from "@/pages/Home";
import Dashboard from "@/pages/Dashboard";
import Settings from "@/pages/Settings";
import Discover from "@/pages/Discover";
import VoiceStudio from "@/pages/VoiceStudio";
import Analytics from "@/pages/Analytics";
import { AppLayout } from "@/components/layouts/AppLayout";
import { ReadingLayout } from "@/components/layouts/ReadingLayout";

export const AppRouter = () => {
  const location = useLocation();
  const isReading = location.pathname === '/read';

  if (isReading) {
    return (
      <ReadingLayout>
        <Index />
      </ReadingLayout>
    );
  }

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/library" element={<Library />} />
        <Route path="/discover" element={<Discover />} />
        <Route path="/voices" element={<VoiceStudio />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/analytics" element={<Analytics />} />
        {/* Fallback for unknown routes */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  );
};
