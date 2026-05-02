const { withBlitz } = require("@blitzjs/next")

/**
 * @type {import('@blitzjs/next').BlitzConfig}
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
  /* Uncomment this to customize the webpack config
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Note: we provide webpack above so you should not `require` it
    // Perform customizations to webpack config
    // Important: return the modified config
    return config
  },
  */
}
module.exports = withBlitz(config)
