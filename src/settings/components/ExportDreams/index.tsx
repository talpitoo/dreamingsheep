import Image from "next/image"
import { useQuery } from "@blitzjs/rpc"
import { Button, Dialog, DialogActions, DialogContent } from "@mui/material"

import { Fragment, useMemo, useState } from "react"
import getDreams from "src/dreams/queries/getDreams"
import getSymbolsWithUsage from "src/symbols/queries/getSymbolsWithUsage"
import { StatGoogleChart } from "src/stats/components/StatGoogleChart"
import { setChartsData } from "src/stats/helpers/chartsData"
import { StatSymbolChart } from "src/stats/components/StatSymbolChart"
import LoadingSpiral from "src/core/components/LoadingSpiral"
import { useCurrentUser } from "src/core/hooks/useCurrentUser"
import {
  cssChartLong,
  cssChartShort,
  cssChartTitle,
  cssCopyright,
  cssDescription,
  cssDreamContainer,
  cssDreamSubtitle,
  cssDreamTitle,
  cssH1Title,
  cssLabel,
  cssLogo,
  cssPage,
  cssSansSerif,
  cssStatsContainer,
  cssTable,
  cssTagline,
  dreamingsheepLogoBase64,
  dreamingsheepTitleBase64,
  hiddenTitle,
  titleDreamsBase64,
  titleStatsBase64,
  titleSymbolsBase64,
} from "./helper"
import { getAntiCSRFToken } from "@blitzjs/auth"
import { Config } from "src/config"

export const ExportDreams = () => {
  const [{ dreams }, { isLoading }] = useQuery(
    getDreams,
    {
      orderBy: { dreamAt: "asc" },
    },
    { refetchOnWindowFocus: false }
  )
  const [{ symbols }] = useQuery(getSymbolsWithUsage, {}, { refetchOnWindowFocus: false })
  const [downloadModalVisibility, setDownloadModalVisibility] = useState(false)
  const chartsData = useMemo(() => setChartsData("all", dreams), [dreams])
  const user = useCurrentUser()

  async function download() {
    const element = document.getElementById("pdf")
    if (element) {
      const csrf = getAntiCSRFToken()
      const res = await fetch("/api/settings/html-to-image", {
        method: "POST",
        headers: {
          "anti-csrf": csrf,
        },
        body: JSON.stringify({ html: element.innerHTML }),
      })
      if (!res.ok) {
        // e.g. a 413 when the journal outgrows the API body limit — don't save the
        // error message as a broken "PDF"
        console.error("PDF generation failed:", res.status, await res.text())
        window.alert("Sorry, the PDF could not be generated. Please try again.")
        return
      }
      const data = await res.arrayBuffer()
      const blob = new Blob([data], { type: "application/pdf" })
      const link = document.createElement("a")
      link.href = window.URL.createObjectURL(blob)
      link.download = "dreamjournal.pdf"
      link.click()
    }
  }

  if (isLoading) return <LoadingSpiral />

  return (
    <Fragment>
      Download <Button onClick={() => setDownloadModalVisibility(true)}>dreamjournal.pdf</Button>{" "}
      with all your dreams, symbols and stats.
      <Dialog
        maxWidth="lg"
        open={downloadModalVisibility}
        onClose={() => setDownloadModalVisibility(false)}
      >
        <DialogContent>
          <div id="pdf">
            {dreams.length > 0 ? (
              <Fragment>
                <div style={cssPage}>
                  <div style={cssLogo}>
                    <Image
                      src={dreamingsheepLogoBase64}
                      alt="dreamingsheep"
                      width={75}
                      height={75}
                    />
                    <Image
                      src={dreamingsheepTitleBase64}
                      alt="dreamingsheep"
                      width="150"
                      height="36"
                    />
                  </div>
                  <h1 style={cssH1Title}>{user && user.username}&apos;s dream journal</h1>
                  {/* <div className="lucidicon lucidicon-friends"></div> */}
                  <h2 style={hiddenTitle}>
                    <Image src={titleDreamsBase64} alt="Dreams" width="127" height="70" />
                    Dreams
                  </h2>
                  {dreams.map((dream) => {
                    return (
                      <div key={dream.id} style={cssDreamContainer}>
                        <h3 style={cssDreamTitle}>{dream.title}</h3>
                        <div style={cssDreamSubtitle}>{dream.dreamAt.toDateString()}</div>
                        <p style={cssDescription}>{dream.description}</p>
                        <div>
                          <span style={cssLabel}>time:</span> {dream.time}
                        </div>
                        <div>
                          <span style={cssLabel}>mood:</span> {dream.mood}
                        </div>
                        <div>
                          <span style={cssLabel}>recall:</span> {dream.recall}
                        </div>
                        <div>
                          <span style={cssLabel}>type:</span> {dream.type}
                        </div>
                        {dream.favorite && (
                          <div>
                            <span style={cssLabel}>favorite:</span> true
                          </div>
                        )}
                        <div>
                          {dream.symbols.length > 0 && (
                            <Fragment>
                              <span style={cssLabel}>symbols:</span>{" "}
                              {dream.symbols.map((symbol, index) => (
                                <span key={symbol.id}>
                                  {symbol.name}
                                  {index < dream.symbols.length - 1 ? (
                                    <Fragment>,&nbsp;</Fragment>
                                  ) : (
                                    ""
                                  )}
                                </span>
                              ))}
                            </Fragment>
                          )}
                        </div>
                      </div>
                    )
                  })}
                  <div style={cssTagline}>Long time no sleep?™</div>
                </div>

                <div style={cssPage}>
                  <h2 style={hiddenTitle}>
                    <Image src={titleSymbolsBase64} alt="Symbols" width="193" height="70" />
                    Symbols
                  </h2>
                  {symbols.length > 0 ? (
                    <Fragment>
                      <table cellPadding="5" style={cssTable}>
                        <thead>
                          <tr>
                            <th align="left" style={cssSansSerif}>
                              name
                            </th>
                            <th align="right" style={cssSansSerif}>
                              occurrence
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {symbols.map((symbol) => {
                            return (
                              <tr key={symbol.id}>
                                <td>{symbol.name}</td>
                                <td align="right">{Number(symbol.occurrences)}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </Fragment>
                  ) : (
                    <Fragment>N/A</Fragment>
                  )}
                </div>

                <div style={cssTagline}></div>

                <div style={cssPage}>
                  <h2 style={hiddenTitle}>
                    <Image src={titleStatsBase64} alt="Stats" width="98" height="70" />
                    Stats
                  </h2>
                  <div style={cssStatsContainer}>
                    {/* <div style={{ ...marginBottom, breakBefore: "always" }}></div> */}
                    <div style={cssChartLong}>
                      <h3 style={cssChartTitle}>dreams</h3>
                      <StatGoogleChart data={chartsData.dream} type="dream" isPdf />
                    </div>
                    <div style={cssChartShort}>
                      <h3 style={cssChartTitle}>mood</h3>
                      <StatGoogleChart data={chartsData.mood} type="mood" isPdf />
                    </div>
                  </div>
                  <div style={cssStatsContainer}>
                    <div style={cssChartShort}>
                      <h3 style={cssChartTitle}>time</h3>
                      <StatGoogleChart data={chartsData.time} type="time" isPdf />
                    </div>
                    <div style={cssChartLong}>
                      <h3 style={cssChartTitle}>type</h3>
                      <StatGoogleChart data={chartsData.type} type="type" isPdf />
                    </div>
                  </div>
                  <div style={cssStatsContainer}>
                    <div style={cssChartLong}>
                      <h3 style={cssChartTitle}>symbols</h3>
                      <StatSymbolChart data={chartsData.symbol} isPdf />
                    </div>
                    <div style={cssChartShort}>
                      <h3 style={cssChartTitle}>recall</h3>
                      <StatGoogleChart data={chartsData.recall} type="recall" isPdf />
                    </div>
                  </div>
                  <div style={cssCopyright}>© 2023-2026 dreamingsheep™</div>
                </div>
              </Fragment>
            ) : (
              <p>No dreams yet.</p>
            )}
          </div>
        </DialogContent>
        <DialogActions sx={{ mx: 2, mb: 2 }}>
          <Button onClick={() => setDownloadModalVisibility(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => download()} sx={{ ml: 2 }}>
            Download
          </Button>
        </DialogActions>
      </Dialog>
    </Fragment>
  )
}

export default ExportDreams
