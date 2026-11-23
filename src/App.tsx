import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { Toaster } from 'sonner';
import { HomePage } from '@/pages/HomePage';
import { CollectionPage } from '@/pages/CollectionPage';
import { AchievementsPage } from '@/pages/AchievementsPage';
import { useGamificationSync } from '@/features/gamification/hooks/useGamificationSync';
import { useAuth } from '@/features/sync/hooks/useAuth';
import { useSyncEngine } from '@/features/sync/hooks/useSyncEngine';

function App() {
  useGamificationSync();
  useAuth();
  useSyncEngine();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/collection/:id" element={<CollectionPage />} />
        <Route path="/achievements" element={<AchievementsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster richColors position="bottom-right" closeButton />
    </BrowserRouter>
  );
}

export default App;
