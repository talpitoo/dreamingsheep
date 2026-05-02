import Head from "next/head"
import { Fragment } from "react"
import Layout from "src/core/layouts/Layout"
import CustomErrorContainer from "src/core/components/CustomErrorContainer"

function Error({ statusCode }) {
  return (
    <Fragment>
      <Head>
        <title>{statusCode}: An error occurred | dreamingsheep</title>
      </Head>

      <CustomErrorContainer>
        <p>
          {statusCode ? `An error ${statusCode} occurred on server` : "An error occurred on client"}
        </p>
      </CustomErrorContainer>
    </Fragment>
  )
}

Error.getLayout = (page) => <Layout>{page}</Layout>

Error.getInitialProps = async ({ res, err }) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404
  return { statusCode }
}

export default Error
