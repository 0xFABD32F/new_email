import { Navigate } from "react-router-dom"

const PrivateRoute = ({ children }) => {
  // Check if user is logged in
  const user = JSON.parse(localStorage.getItem("user"))

  // If not logged in, redirect to login page
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // If logged in, render the protected component
  return children
}

export default PrivateRoute
