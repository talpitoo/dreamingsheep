import { useState, useEffect } from "react"
import { Alert, IconButton } from "@mui/material"
import CloseIcon from "@mui/icons-material/Close"
import Link from "next/link"
import { Routes } from "src/routes"

const COOKIE_NOTICE_KEY = "cookieNoticeAcknowledged"

export const CookieNotice = () => {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Only show if not previously acknowledged
    // Small delay to avoid hydration issues
    const timer = setTimeout(() => {
      const acknowledged = localStorage.getItem(COOKIE_NOTICE_KEY)
      if (!acknowledged) {
        setVisible(true)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [])

  const handleDismiss = () => {
    localStorage.setItem(COOKIE_NOTICE_KEY, "true")
    setVisible(false)
  }

  if (!visible) return null

  return (
    <Alert
      severity="info"
      className="mt-4 text-start"
      action={
        <IconButton
          aria-label="dismiss cookie notice"
          color="inherit"
          size="small"
          onClick={handleDismiss}
        >
          <CloseIcon fontSize="inherit" />
        </IconButton>
      }
    >
      We use cookies to keep you logged in and Google Analytics for anonymous usage statistics.{" "}
      <Link href={Routes.PrivacyPolicyPage()}>Privacy Policy</Link>
    </Alert>
  )
}

export default CookieNotice
