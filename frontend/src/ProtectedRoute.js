import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "./context/AuthContext";

export default function ProtectedRoute({ children }) {
  //React context API is built in react tool used to create this "cloud"
  //REACT CONTEXT API | state it gloabally and access it anywhere in the component tree without prop drilling
  //CONSUME IT - inside a specific component, pull the data out of the cloud and use it
  const { token } = useContext(AuthContext);
  if (!token) return <Navigate to="/login" replace />;
  return children;
}