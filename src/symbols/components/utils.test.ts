import { describe, expect, it } from "vitest"
import { getSrcNoDomain } from "./utils"

describe("getSrcNoDomain", () => {
  it("strips everything up to and including the S3 domain", () => {
    expect(
      getSrcNoDomain("https://s3-bucket-dreamingsheep.s3.us-west-1.amazonaws.com/uploads/1/dao.png")
    ).toBe("/uploads/1/dao.png")
  })

  it("returns non-S3 sources untouched (relative paths, other hosts)", () => {
    expect(getSrcNoDomain("/assets/sheep-stats.png")).toBe("/assets/sheep-stats.png")
    expect(getSrcNoDomain("https://images.pexels.com/photo.jpg")).toBe(
      "https://images.pexels.com/photo.jpg"
    )
  })

  it("cuts at the FIRST amazonaws.com occurrence when the path itself contains it", () => {
    expect(getSrcNoDomain("https://x.amazonaws.com/dir/amazonaws.com.png")).toBe(
      "/dir/amazonaws.com.png"
    )
  })
})
