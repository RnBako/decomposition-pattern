import { Route, Routes } from 'react-router-dom';
import { AppLayout, PublicLayout } from './components/AppLayout';
import { GuestOnly, RequireAdmin, RequireAuth } from './components/RequireAuth';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { LogoutPage } from './pages/LogoutPage';
import { WishlistsPage } from './pages/WishlistsPage';
import { WishlistNewPage } from './pages/WishlistNewPage';
import { WishlistDetailPage } from './pages/WishlistDetailPage';
import { WishlistEditPage } from './pages/WishlistEditPage';
import { GiftNewPage } from './pages/GiftNewPage';
import { GiftEditPage } from './pages/GiftEditPage';
import { TrashPage } from './pages/TrashPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { MyBookingsPage } from './pages/MyBookingsPage';
import { SharePage } from './pages/SharePage';
import { AdminPage } from './pages/AdminPage';
import { NotFoundPage } from './pages/NotFoundPage';

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route
          path="/login"
          element={
            <GuestOnly>
              <LoginPage />
            </GuestOnly>
          }
        />
        <Route
          path="/register"
          element={
            <GuestOnly>
              <RegisterPage />
            </GuestOnly>
          }
        />
        <Route path="/w/:token" element={<SharePage />} />
      </Route>

      <Route path="/logout" element={<LogoutPage />} />

      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<HomePage />} />
        <Route path="/wishlists" element={<WishlistsPage />} />
        <Route path="/wishlists/new" element={<WishlistNewPage />} />
        <Route path="/wishlists/:id" element={<WishlistDetailPage />} />
        <Route path="/wishlists/:id/edit" element={<WishlistEditPage />} />
        <Route path="/wishlists/:id/gifts/new" element={<GiftNewPage />} />
        <Route path="/wishlists/:id/gifts/:giftId/edit" element={<GiftEditPage />} />
        <Route path="/wishlists/:id/trash" element={<TrashPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/my-bookings" element={<MyBookingsPage />} />
        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <AdminPage />
            </RequireAdmin>
          }
        />
      </Route>

      <Route element={<AppLayout />}>
        <Route path="/404" element={<NotFoundPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
