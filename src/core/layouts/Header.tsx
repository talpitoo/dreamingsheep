import Link from "next/link"
import Image from "next/image"
import { useSession } from "@blitzjs/auth"
import { useRouter } from "next/router"
import { useMutation } from "@blitzjs/rpc"
import {
  AppBar,
  Box,
  Button,
  ClickAwayListener,
  InputAdornment,
  Menu,
  MenuItem,
  TextField,
  Toolbar,
} from "@mui/material"
import logout from "src/auth/mutations/logout"
import React, { Fragment, useEffect, useState } from "react"
import logo from "public/assets/logo-dreamingsheep-white.png"
import title from "public/assets/title-dreamingsheep.png"
import { Routes } from ".blitz"
import { Logout, Search, Settings, ExpandMore } from "@mui/icons-material"
import { useTheme } from "@mui/material/styles"

const SQUARE_LOGO_SIZE = 150

export function Header() {
  const session = useSession()
  const router = useRouter()
  const [logoutMutation] = useMutation(logout)
  const [query, setQuery] = useState(router.query.q ?? "")
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const theme = useTheme()

  function handleMenu(event: React.MouseEvent<HTMLElement>) {
    setAnchorEl(event.currentTarget)
  }

  function handleClose() {
    setAnchorEl(null)
  }

  function onSearchSubmit() {
    collapseMobileMenu()
    router.push(Routes.SearchPage({ c: "TRUE", q: encodeURI(query as string) }))
  }

  const [expanded, setExpanded] = React.useState(false)

  const handleExpandClick = () => {
    setExpanded(!expanded)
  }

  const collapseMobileMenu = () => {
    setExpanded(false)
  }

  // auto-collapse the mobile menu on EVERY navigation (logo, account menu, back/forward, ...),
  // not only on the nav buttons with an explicit onClick
  useEffect(() => {
    router.events.on("routeChangeStart", collapseMobileMenu)
    return () => {
      router.events.off("routeChangeStart", collapseMobileMenu)
    }
  }, [router.events])

  async function handleLogout() {
    await logoutMutation()
    if (isAuthenticatedPage(router.pathname)) {
      // full page load instead of a client-side push: the dead session would make the still-mounted
      // authenticated page throw AuthenticationError (issue #10), and a reload also flushes
      // dream data from the in-memory query cache
      window.location.assign(Routes.Home().pathname)
    }
  }

  const isAuthenticatedPage = (currentRoutePathname: string) => {
    if (
      currentRoutePathname === Routes.Home().pathname ||
      currentRoutePathname === Routes.BlogPage().pathname ||
      currentRoutePathname === Routes.FaqPage().pathname ||
      currentRoutePathname === Routes.PrivacyPolicyPage().pathname
    ) {
      return false
    }
    return true
  }

  return (
    <Fragment>
      {session.userId && (
        /* collapse the expanded mobile menu when clicking/tapping anywhere outside the navbar */
        <ClickAwayListener onClickAway={collapseMobileMenu}>
          <AppBar
            position="sticky"
            color="secondary"
            className="translate-x-0 translate-y-0 transform-gpu"
          >
            <Toolbar
              className="py-3 translate-x-0 translate-y-0 transform-gpu"
              sx={{
                minHeight: { xs: "80px" },
                ...(expanded && {
                  flexDirection: { xs: "column", md: "row" },
                }),
                ...(!expanded && {
                  flexDirection: "row",
                }),
              }}
            >
              <div className="absolute top-0 left-0">
                <Link href={Routes.Home()} passHref={true}>
                  <Box>
                    <Image
                      src={logo}
                      alt="logo-white"
                      width={SQUARE_LOGO_SIZE}
                      height={SQUARE_LOGO_SIZE}
                    />
                  </Box>
                </Link>
              </div>

              <Box
                className="flex-grow mr-8"
                sx={{
                  ...(expanded && {
                    marginLeft: { xs: "0", md: `${SQUARE_LOGO_SIZE - 30}px` },
                  }),
                  ...(!expanded && {
                    marginLeft: `${SQUARE_LOGO_SIZE - 30}px`,
                  }),
                }}
              >
                <Link href={Routes.Home()} passHref={true}>
                  <Box
                    sx={{
                      ...(expanded && {
                        display: { xs: "block", sm: "flex" },
                        position: { xs: "absolute", md: "static" },
                        top: "3.75rem",
                        right: "1.25rem",
                      }),
                      ...(!expanded && {
                        display: { xs: "none", lg: "flex" },
                        position: "static",
                      }),
                    }}
                  >
                    <Image
                      className="cursor-pointer xsmax:w-[160px] xsmax:h-[37px]"
                      src={title}
                      alt="logo-title"
                      width={216}
                      height={50}
                    />
                  </Box>
                </Link>
              </Box>

              <Fragment>
                <Button
                  sx={{
                    position: "absolute",
                    right: "1rem",
                    top: "22px",
                    borderColor: "lightgray",
                    display: { xs: "block", md: "none" },
                  }}
                  aria-expanded={expanded}
                  onClick={handleExpandClick}
                  variant="outlined"
                  color="inherit"
                >
                  Menu
                </Button>
              </Fragment>

              <Box
                sx={{
                  ...(expanded && {
                    marginTop: { xs: "8.5rem", md: "0" },
                    display: { xs: "grid", md: "flex" },
                    flexDirection: { xs: "column", md: "row" },
                    alignItems: { xs: "start", md: "center" },
                    width: { xs: "100%", md: "auto" },
                  }),
                  ...(!expanded && {
                    marginTop: "0",
                    display: { xs: "none", md: "flex" },
                    flexDirection: "row",
                    alignItems: "center",
                    width: "auto",
                  }),
                }}
              >
                <Link href={Routes.DreamsPage()} passHref={true}>
                  <Button
                    sx={{
                      flexShrink: 0,
                      ...(expanded && {
                        mr: { xs: 0, md: 2 },
                      }),
                      ...(!expanded && {
                        mr: 2,
                      }),
                      "&:hover": { textDecoration: "none !important" },
                      backgroundColor:
                        Routes.DreamsPage().pathname === router.pathname
                          ? "lightgray !important"
                          : "transparent",
                    }}
                    color="inherit"
                    onClick={collapseMobileMenu}
                    className="w-full md:w-auto text-[#202020]"
                  >
                    Dreams
                  </Button>
                </Link>
                <Link href={Routes.SymbolsPage()} passHref={true}>
                  <Button
                    sx={{
                      flexShrink: 0,
                      ...(expanded && {
                        mr: { xs: 0, md: 2 },
                      }),
                      ...(!expanded && {
                        mr: 2,
                      }),
                      "&:hover": { textDecoration: "none !important" },
                      backgroundColor:
                        Routes.SymbolsPage().pathname === router.pathname
                          ? "lightgray !important"
                          : "transparent",
                    }}
                    color="inherit"
                    onClick={collapseMobileMenu}
                    className="w-full md:w-auto text-[#202020]"
                  >
                    Symbols
                  </Button>
                </Link>
                <Link href={Routes.StatsPage()} passHref={true}>
                  <Button
                    sx={{
                      flexShrink: 0,
                      ...(expanded && {
                        mr: { xs: 0, md: 2 },
                      }),
                      ...(!expanded && {
                        mr: 2,
                      }),
                      "&:hover": { textDecoration: "none !important" },
                      backgroundColor:
                        Routes.StatsPage().pathname === router.pathname
                          ? "lightgray !important"
                          : "transparent",
                    }}
                    color="inherit"
                    onClick={collapseMobileMenu}
                    className="w-full md:w-auto text-[#202020]"
                  >
                    Stats
                  </Button>
                </Link>
                <Link href={Routes.FaqPage()} passHref={true}>
                  <Button
                    sx={{
                      flexShrink: 0,
                      ...(expanded && {
                        mr: { xs: 0, md: 2 },
                      }),
                      ...(!expanded && {
                        mr: 2,
                      }),
                      "&:hover": { textDecoration: "none !important" },
                      backgroundColor:
                        Routes.FaqPage().pathname === router.pathname
                          ? "lightgray !important"
                          : "transparent",
                    }}
                    color="inherit"
                    onClick={collapseMobileMenu}
                    className="w-full md:w-auto text-[#202020]"
                  >
                    FAQ
                  </Button>
                </Link>
                <Link href={Routes.BlogPage()} passHref={true}>
                  <Button
                    sx={{
                      flexShrink: 0,
                      ...(expanded && {
                        mr: { xs: 0, md: 2 },
                      }),
                      ...(!expanded && {
                        mr: 2,
                      }),
                      "&:hover": { textDecoration: "none !important" },
                      backgroundColor: router.pathname.startsWith(Routes.BlogPage().pathname)
                        ? "lightgray !important"
                        : "transparent",
                    }}
                    color="inherit"
                    onClick={collapseMobileMenu}
                    className="w-full md:w-auto text-[#202020]"
                  >
                    Blog
                  </Button>
                </Link>
                <TextField
                  sx={{
                    ...(expanded && {
                      mr: { xs: 0, md: 2 },
                      mb: { xs: 2, md: 0 },
                      order: { xs: -1, md: "unset" },
                    }),
                    ...(!expanded && {
                      mr: 2,
                      mb: 0,
                    }),
                  }}
                  className="translate-x-0 translate-y-0 transform-gpu"
                  // InputLabelProps={{ shrink: true, disableAnimation: true }}
                  // variant="outlined"
                  placeholder="Search..."
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && onSearchSubmit()}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <Search />
                      </InputAdornment>
                    ),
                  }}
                />
                <Link href={Routes.SettingsPage()} passHref={true} className="hover:!no-underline">
                  <Button
                    sx={{
                      ...(expanded && {
                        mr: { xs: 0, md: 2 },
                        display: { xs: "flex", md: "none" },
                      }),
                      ...(!expanded && {
                        display: "none",
                      }),
                      "&:hover": { textDecoration: "none !important" },
                      backgroundColor:
                        Routes.SettingsPage().pathname === router.pathname
                          ? "lightgray !important"
                          : "transparent",
                    }}
                    color="inherit"
                    onClick={collapseMobileMenu}
                    className="w-full md:w-auto text-[#202020]"
                  >
                    Settings
                  </Button>
                </Link>
                <Button
                  sx={{
                    ...(expanded && {
                      mr: { xs: 0, md: 2 },
                      mb: { xs: 1, sm: 2, md: 0 },
                      display: { xs: "flex", md: "none" },
                    }),
                    ...(!expanded && {
                      display: "none",
                    }),
                  }}
                  color="inherit"
                  onClick={handleLogout}
                >
                  <Logout />
                  <Box sx={{ ml: ".5rem" }}>Sign out</Box>
                </Button>

                <Button
                  aria-label="Account of current user"
                  aria-controls="menu-appbar"
                  aria-haspopup="true"
                  onClick={handleMenu}
                  color="inherit"
                  endIcon={<ExpandMore />}
                  sx={{
                    backgroundColor:
                      Routes.SettingsPage().pathname === router.pathname
                        ? "lightgray !important"
                        : "transparent",
                    ...(expanded && {
                      display: { xs: "none", md: "flex" },
                    }),
                    ...(!expanded && {
                      display: "flex",
                    }),
                  }}
                >
                  <Box className="account-dropdown">{session.username}</Box>
                </Button>

                <Menu
                  id="menu-appbar"
                  anchorEl={anchorEl}
                  keepMounted
                  open={Boolean(anchorEl)}
                  onClose={handleClose}
                  disableScrollLock={true}
                >
                  <MenuItem
                    onClick={() => {
                      router.push(Routes.SettingsPage())
                      handleClose()
                    }}
                  >
                    <Settings />
                    <Box sx={{ ml: ".5rem" }}>Settings</Box>
                  </MenuItem>
                  <MenuItem
                    onClick={async () => {
                      handleClose()
                      await handleLogout()
                    }}
                  >
                    <Logout />
                    <Box sx={{ ml: ".5rem" }}>Sign out</Box>
                  </MenuItem>
                </Menu>
              </Box>
            </Toolbar>
          </AppBar>
        </ClickAwayListener>
      )}
    </Fragment>
  )
}

export default Header
