import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoadingState } from './components/ui/Feedback';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import CountriesPage from './pages/CountriesPage';
import TopicsPage from './pages/TopicsPage';
import ArticlesListPage from './pages/ArticlesListPage';
import ArticleEditorPage from './pages/ArticleEditorPage';
import AuditPage from './pages/AuditPage';
import RagIndexPage from './pages/RagIndexPage';

// LocationsPage keo theo leaflet/react-leaflet (~150kB) -- tach rieng chunk
// va chi tai khi nguoi dung thuc su vao trang do (Rule 13A, W4 canh bao bundle qua lon).
const LocationsPage = lazy(() => import('./pages/LocationsPage'));

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/countries" element={<ProtectedRoute><CountriesPage /></ProtectedRoute>} />
      <Route path="/topics" element={<ProtectedRoute><TopicsPage /></ProtectedRoute>} />
      <Route path="/articles" element={<ProtectedRoute><ArticlesListPage /></ProtectedRoute>} />
      <Route path="/articles/new" element={<ProtectedRoute><ArticleEditorPage /></ProtectedRoute>} />
      <Route path="/articles/:id" element={<ProtectedRoute><ArticleEditorPage /></ProtectedRoute>} />
      <Route
        path="/locations"
        element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingState />}>
              <LocationsPage />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route path="/audit" element={<ProtectedRoute><AuditPage /></ProtectedRoute>} />
      <Route path="/rag" element={<ProtectedRoute><RagIndexPage /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
