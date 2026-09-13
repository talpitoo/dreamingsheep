import Link from "next/link"
import Image from "next/image"
import { useSession } from "src/auth/client"
import { useRouter } from "next/router"
import { useMutation } from "src/core/rpc-client"
import {
  AppBar,
  Box,
  Button,
  ClickAwayListener,
  Collapse,
  InputAdornment,
  Menu,
  MenuItem,
  TextField,
  Toolbar,
  useMediaQuery,
} from "@mui/material"
import { logout } from "src/auth/client-mutations"
import React, { Fragment, useEffect, useState } from "react"
import logo from "public/assets/logo-dreamingsheep-white.png"
import title from "public/assets/title-dreamingsheep.png"
import { Routes } from "src/routes"
import { Logout, Search, Settings, ExpandMore } from "@mui/icons-material"
import { useTheme } from "@mui/material/styles"
import classnames from "src/utils/classnames"

const SQUARE_LOGO_SIZE = 150

export function Header() {
  const session = useSession()
  const router = useRouter()
  const [logoutMutation] = useMutation(logout)
  const [query, setQuery] = useState(router.query.q ?? "")
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const theme = useTheme()
  // noSsr: the header only renders with a session (client-side), so resolve the
  // breakpoint immediately instead of a false-then-true double render
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"), { noSsr: true })

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
            {/* below md the mobile menu is a full-width Collapse that wraps to its own line;
                md+ must stay nowrap like before, otherwise the nav wraps under the logo at
                borderline widths instead of squeezing onto one row */}
            <Toolbar className="py-3 translate-x-0 translate-y-0 transform-gpu min-h-20 flex-wrap md:flex-nowrap">
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

              {/* on xs the box is empty (title hidden or absolutely positioned), so the logo
                  offset only matters from md up. md:ml-30 = 120px = SQUARE_LOGO_SIZE - 30 */}
              <Box className="grow mr-8 ml-0 md:ml-30">
                <Link href={Routes.Home()} passHref={true}>
                  <Box
                    className={classnames(
                      expanded
                        ? "block sm:flex absolute md:static top-15 right-5"
                        : "hidden lg:flex static"
                    )}
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
                  className="absolute right-4 top-[22px] border-[lightgray] block md:hidden"
                  aria-expanded={expanded}
                  onClick={handleExpandClick}
                  variant="outlined"
                  color="inherit"
                >
                  Menu
                </Button>
              </Fragment>

              {/* Collapse (same animation as the search/stats filter panels) slides the
                  mobile menu open/closed; on md+ it's permanently open, so the desktop
                  nav renders exactly as before */}
              <Collapse in={expanded || isDesktop} className="w-full md:w-auto">
                {/* padding (not margin — margins don't count into Collapse's measured height)
                    clears the absolutely positioned title image on mobile; pt-34 = 8.5rem */}
                <Box className="pt-34 md:pt-0 grid md:flex flex-col md:flex-row items-start md:items-center w-full md:w-auto">
                  <Link href={Routes.DreamsPage()} passHref={true}>
                    <Button
                      color="inherit"
                      onClick={collapseMobileMenu}
                      className={classnames(
                        "w-full md:w-auto text-[#202020] shrink-0 mr-0 md:mr-4 hover:no-underline!",
                        Routes.DreamsPage().pathname === router.pathname
                          ? "bg-[lightgray]!"
                          : "bg-transparent"
                      )}
                    >
                      Dreams
                    </Button>
                  </Link>
                  <Link href={Routes.SymbolsPage()} passHref={true}>
                    <Button
                      color="inherit"
                      onClick={collapseMobileMenu}
                      className={classnames(
                        "w-full md:w-auto text-[#202020] shrink-0 mr-0 md:mr-4 hover:no-underline!",
                        Routes.SymbolsPage().pathname === router.pathname
                          ? "bg-[lightgray]!"
                          : "bg-transparent"
                      )}
                    >
                      Symbols
                    </Button>
                  </Link>
                  <Link href={Routes.StatsPage()} passHref={true}>
                    <Button
                      color="inherit"
                      onClick={collapseMobileMenu}
                      className={classnames(
                        "w-full md:w-auto text-[#202020] shrink-0 mr-0 md:mr-4 hover:no-underline!",
                        Routes.StatsPage().pathname === router.pathname
                          ? "bg-[lightgray]!"
                          : "bg-transparent"
                      )}
                    >
                      Stats
                    </Button>
                  </Link>
                  <Link href={Routes.FaqPage()} passHref={true}>
                    <Button
                      color="inherit"
                      onClick={collapseMobileMenu}
                      className={classnames(
                        "w-full md:w-auto text-[#202020] shrink-0 mr-0 md:mr-4 hover:no-underline!",
                        Routes.FaqPage().pathname === router.pathname
                          ? "bg-[lightgray]!"
                          : "bg-transparent"
                      )}
                    >
                      FAQ
                    </Button>
                  </Link>
                  <Link href={Routes.BlogPage()} passHref={true}>
                    <Button
                      color="inherit"
                      onClick={collapseMobileMenu}
                      className={classnames(
                        "w-full md:w-auto text-[#202020] shrink-0 mr-0 md:mr-4 hover:no-underline!",
                        router.pathname.startsWith(Routes.BlogPage().pathname)
                          ? "bg-[lightgray]!"
                          : "bg-transparent"
                      )}
                    >
                      Blog
                    </Button>
                  </Link>
                  <TextField
                    className="translate-x-0 translate-y-0 transform-gpu mr-0 md:mr-4 mb-4 md:mb-0 -order-1 md:order-none"
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
                  <Link
                    href={Routes.SettingsPage()}
                    passHref={true}
                    className="hover:no-underline!"
                  >
                    <Button
                      color="inherit"
                      onClick={collapseMobileMenu}
                      // mobile-menu-only entry; the desktop nav has the account dropdown instead
                      className={classnames(
                        "w-full md:w-auto text-[#202020] mr-0 md:mr-4 flex md:hidden hover:no-underline!",
                        Routes.SettingsPage().pathname === router.pathname
                          ? "bg-[lightgray]!"
                          : "bg-transparent"
                      )}
                    >
                      Settings
                    </Button>
                  </Link>
                  <Button
                    // mobile-menu-only entry; the desktop nav has the account dropdown instead
                    className="mr-0 md:mr-4 mb-2 sm:mb-4 md:mb-0 flex md:hidden"
                    color="inherit"
                    onClick={handleLogout}
                  >
                    <Logout />
                    <Box className="ml-2">Sign out</Box>
                  </Button>

                  <Button
                    aria-label="Account of current user"
                    aria-controls="menu-appbar"
                    aria-haspopup="true"
                    onClick={handleMenu}
                    color="inherit"
                    endIcon={<ExpandMore />}
                    className={classnames(
                      "hidden md:flex",
                      Routes.SettingsPage().pathname === router.pathname
                        ? "bg-[lightgray]!"
                        : "bg-transparent"
                    )}
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
                      <Box className="ml-2">Settings</Box>
                    </MenuItem>
                    <MenuItem
                      onClick={async () => {
                        handleClose()
                        await handleLogout()
                      }}
                    >
                      <Logout />
                      <Box className="ml-2">Sign out</Box>
                    </MenuItem>
                  </Menu>
                </Box>
              </Collapse>
            </Toolbar>
          </AppBar>
        </ClickAwayListener>
      )}
    </Fragment>
  )
}

export default Header
