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
}
module.exports = config
