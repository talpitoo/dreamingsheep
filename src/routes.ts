// Hand-written replacement for Blitz's generated Routes manifest. Helpers return
// { pathname, query? } — exactly what next/router's push/replace accept, and
// what gSSP reads via `.pathname`.

export interface RouteUrlObject {
  pathname: string
  query?: Record<string, string | number | undefined>
}

const route =
  (pathname: string) =>
  (query?: RouteUrlObject["query"]): RouteUrlObject =>
    query ? { pathname, query } : { pathname }

export const Routes = {
  Home: route("/"),
  DreamsPage: route("/dreams"),
  SearchPage: route("/search"),
  StatsPage: route("/stats"),
  SettingsPage: route("/settings"),
  SymbolsPage: route("/symbols"),
  SignupPage: route("/signup"),
  VerifyUserPage: route("/verify-user"),
  ForgotPasswordPage: route("/forgot-password"),
  ResetPasswordPage: route("/reset-password"),
  BlogPage: route("/blog"),
  FaqPage: route("/faq"),
  PrivacyPolicyPage: route("/privacy-policy"),
  TermsOfServicePage: route("/terms-of-service"),
  ArticlePageAGlitchInTheDreamJournalMatrix: route("/blog/a-glitch-in-the-dream-journal-matrix"),
  ArticlePageBackstoryTheBeginnings: route("/blog/backstory-the-beginnings"),
  ArticlePageDreamingsheepIsNowOpenSource: route("/blog/dreamingsheep-is-now-open-source"),
  ArticlePageDreamingsheepV101Released: route("/blog/dreamingsheep-v1-0-1-released"),
  ArticlePageLifePurposeMilestoneOne: route("/blog/life-purpose-milestone-1"),
  ArticlePagePrivacyPolicyAndTermsOfServiceUpdate: route(
    "/blog/privacy-policy-and-terms-of-service-update"
  ),
  ArticlePageSupportUsOnPatreon: route("/blog/support-us-on-patreon"),
  ArticlePageTheBrainstorming: route("/blog/the-brainstorming"),
  ArticlePageTheExplainerVideoIsStillInTheWorks: route(
    "/blog/the-explainer-video-is-still-in-the-works"
  ),
  ArticlePageUseCaseOneCustomDrawing: route("/blog/use-case-one-custom-drawing"),
  ArticlePageUseCaseThreeOffTheCharts: route("/blog/use-case-three-off-the-charts"),
  ArticlePageUseCaseTwoAddToHomeScreen: route("/blog/use-case-two-add-to-home-screen"),
}
