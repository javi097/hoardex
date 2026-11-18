import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { Toaster } from 'sonner';
import { HomePage } from '@/pages/HomePage';
import { CollectionPage } from '@/pages/CollectionPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/collection/:id" element={<CollectionPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster richColors position="bottom-right" closeButton />
    </BrowserRouter>
  );
}

export default App;
