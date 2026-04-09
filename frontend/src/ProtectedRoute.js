import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "./context/AuthContext";

/*
 * ProtectedRoute — tiny auth gate for pages that require a signed-in user.
 *
 * If there is no token in AuthContext, we immediately redirect to /login.
 * Otherwise we simply render the child page unchanged.
 */
export default function ProtectedRoute({ children }) {
  // AuthContext is the shared source of truth for the current session.
  const { token } = useContext(AuthContext);
  if (!token) return <Navigate to="/login" replace />;
  return children;
}
