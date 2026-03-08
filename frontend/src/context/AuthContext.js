import { createContext, useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";

//CREATE CONTEXT
export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  //check if user already has saved token
  const [token, setToken] = useState(localStorage.getItem("token") || ""); //read token from localStorage on initial load
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (!token) {
      setUser(null);
      return;
    }
    try {
      const decoded = jwtDecode(token);
      setUser(decoded); // { id, username }
    } catch {
      setUser(null);
      setToken("");
      localStorage.removeItem("token");
    }
  }, [token]);

  //LOGIN
  //Save token to localStorage and update state
  const login = (newToken) => {
    localStorage.setItem("token", newToken);
    setToken(newToken);
  };

  //LOGOUT
  //remove token from localStorage and update state
  const logout = () => {
    localStorage.removeItem("token");
    setToken("");
    setUser(null);
  };

  return (
    // To act like a loudspeaker, broadcasting the token variable to any component inside of it
    //PROVIDE CONTEXT - wrap the app in this cloud and give it the actual data (like the token or login function)
    <AuthContext.Provider value={{ token, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}