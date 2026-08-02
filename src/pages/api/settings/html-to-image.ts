import type { NextApiRequest, NextApiResponse } from "next"
import { getSession } from "src/auth/session"
import puppeteer from "puppeteer"
// https://github.com/puppeteer/puppeteer/blob/v14.1.0/docs/api.md#pagepdfoptions

export const config = {
  api: {
    // the serialized #pdf markup (all dreams + inlined base64 images) easily exceeds
    // Next's default 1mb body limit — which used to truncate downloads to a 23-byte
    // "Body exceeded 1mb limit" response saved as the PDF
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
}

async function htmlToImage(html = "", css = "") {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  })
  const page = await browser.newPage()

  await page.setContent(html, {
    waitUntil: ["load", "networkidle0"],
  })

  const pdfBuffer = await page.pdf({
    format: "A4",
    printBackground: true,
    margin: {
      top: 40,
      bottom: 40,
      left: 40,
      right: 40,
    },
  })

  await page.close()
  await browser.close()

  return pdfBuffer
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // CSRF stays enforced here — ExportDreams sends the correct `anti-csrf` header
  const session = await getSession(req, res)
  if (!session.userId) {
    res.status(401).end()
    return
  }
  const { html, css } = JSON.parse(req.body)
  const pdf = await htmlToImage(html, css)
  res.send(pdf)
}
