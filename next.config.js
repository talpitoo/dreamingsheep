/**
 * @type {import('next').NextConfig}
 **/
const config = {
  images: {
    unoptimized: true, // Only for testing, or to resolve the srcset bug
    domains: [
      "images.pexels.com",
      "images.tothtamas.tt",
      "s3-bucket-dreamingsheep-dev.s3.us-west-1.amazonaws.com",
      "s3-bucket-dreamingsheep-prod-do-not-touch.s3.us-west-1.amazonaws.com",
    ],
  },
  async headers() {
    return [
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache" }] },
      { source: "/sw-precache.json", headers: [{ key: "Cache-Control", value: "no-cache" }] },
    ]
  },
}
module.exports = config
