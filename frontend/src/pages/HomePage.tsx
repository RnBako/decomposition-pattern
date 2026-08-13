import { Navigate } from 'react-router-dom';

/** `/` redirects to wishlists list (MVP dashboard = list) */
export function HomePage() {
  return <Navigate to="/wishlists" replace />;
}
