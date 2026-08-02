import Link from "next/link"
import { Routes } from "src/routes"
import React, { Fragment, Suspense } from "react"
import { Typography, Container, Box } from "@mui/material"
import { useCurrentUser } from "src/core/hooks/useCurrentUser"

// const Box = styled("footer")`
//   box-decoration-break: clone;
//   padding: 0.75rem 1.5em 0.75rem 0.75rem;
//   background-image: linear-gradient(
//     115deg,
//     rgba(255, 255, 255, 0.75) calc(100% - 1em),
//     transparent calc(100% - 1em)
//   );
//   line-height: 2.6rem;
// `

const footerTags: { quote: string; source?: string }[] = [
  { quote: "Long time no sleep?™", source: "" },
  { quote: "Long time no sheep?", source: "" },
  { quote: "Is this a dream?", source: "" },
  { quote: "2046", source: "" },
  { quote: "Long time no see?", source: "" },
  { quote: "Long time no sea?", source: "" },
  { quote: "No sleep, no sheep?", source: "" },
  { quote: "“Is It Future Or Is It Past?”", source: "— Twin Peaks" },
  { quote: "“Fire Walk with Me”", source: "— Twin Peaks" },
  { quote: "“Open Your Mind”", source: "— Total Recall" },
  { quote: "“Spice changes people into travelers, mystics and madmen.”", source: "— Dune" },
  { quote: "“Too low they build, who build beneath the stars.”", source: "—  Edward Young" },
]

const FooterTag = () => {
  const user = useCurrentUser()
  const footerTag = footerTags[Math.floor(Math.random() * footerTags.length)]
  return (
    <Fragment>
      {user ? (
        <Box>
          <Typography
            variant="body1"
            color="white"
            fontStyle="italic"
            className="text-center"
            sx={{
              margin: { xs: "2rem auto", sm: "3rem auto" },
            }}
          >
            {footerTag?.quote}
            <br />
            {footerTag?.source}
          </Typography>
        </Box>
      ) : (
        <Typography
          variant="body1"
          color="white"
          fontStyle="italic"
          className="text-center"
          sx={{
            margin: { xs: "2rem auto", sm: "3rem auto" },
          }}
        >
          Long time no sleep?™
        </Typography>
      )}
    </Fragment>
  )
}

export function Footer() {
  return (
    <Container sx={{ textAlign: "center", position: "relative" }}>
      {/* <Box sx={{ position: "absolute", width: "5rem", margin: "1rem" }}>
        <Image src={arrowReadMore} alt="scroll to read more" />
      </Box> */}

      <Suspense
        fallback={
          <Typography
            variant="body1"
            color="white"
            fontStyle="italic"
            className="text-center"
            sx={{
              margin: { xs: "2rem auto", sm: "3rem auto" },
            }}
          >
            Long time no sleep?™
          </Typography>
        }
      >
        <FooterTag />
      </Suspense>

      <Box className="footer-stripe">
        <Link href="/">Home</Link> |{" "}
        <Link href={Routes.BlogPage()} passHref={true}>
          Blog
        </Link>{" "}
        |{" "}
        <Link href={Routes.FaqPage()} passHref={true}>
          FAQ
        </Link>{" "}
        |{" "}
        <span className="whitespace-nowrap">
          <Link href={Routes.PrivacyPolicyPage()} passHref={true}>
            Privacy Policy
          </Link>
        </span>{" "}
        |{" "}
        <span className="whitespace-nowrap">
          <Link href={Routes.TermsOfServicePage()} passHref={true}>
            Terms of Service
          </Link>
        </span>{" "}
        | <Link href="mailto:meh@dreamingsheep.net">Contact</Link>{" "}
        <span className="whitespace-nowrap">&copy; 2023-2026 dreamingsheep™</span>
      </Box>
    </Container>
  )
}

export default Footer
