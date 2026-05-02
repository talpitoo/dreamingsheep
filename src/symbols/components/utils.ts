export function getSrcNoDomain(src: string) {
  if (src.includes("amazonaws.com")) {
    return src.slice(src.indexOf("amazonaws.com") + "amazonaws.com".length)
  }

  return src
}
