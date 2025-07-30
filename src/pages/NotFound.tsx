import { useLocation } from "react-router-dom"
import { useEffect } from "react"

const NotFound = () => {
  const location = useLocation()

  useEffect(() => {
    console.error(
      "Erreur 404 : Redirection externe vers la landing page. Route non trouvée :",
      location.pathname
    )

    // Redirection immédiate vers la 404 de la landing
    window.location.href = "https://tiro.agency/404"
  }, [location.pathname])

  return null // on ne rend rien
}

export default NotFound
