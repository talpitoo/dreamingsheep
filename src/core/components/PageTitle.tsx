import Image, { StaticImageData } from "next/image"
import { useEffect, useRef, useState } from "react"
import classnames from "src/utils/classnames"

interface PageTitleProps {
  image: StaticImageData
  text: string
  width: number
  height: number
  // the blog articles frame their "Blog" title in a div (their h1 is the article's own title)
  as?: "h1" | "div"
  className?: string
}

// a handwritten page title: the image when it loads, the same words as text when it does not — a
// failed asset, a slow connection, or offline, where the worker answers an uncached title image
// with a transparent pixel rather than a sheep. Nothing offline-specific here: a title that cannot
// draw itself writes itself. Online the markup is what it always was — the image plus the words
// for screen readers (`sr-only`).
export default function PageTitle({
  image,
  text,
  width,
  height,
  as: Tag = "h1",
  className,
}: PageTitleProps) {
  const [failed, setFailed] = useState(false)
  const heading = useRef<HTMLHeadingElement & HTMLDivElement>(null)

  const settle = (img: HTMLImageElement | null | undefined) => {
    // a broken image reports 0×0; the worker's stand-in is a 1×1
    if (img && img.complete && img.naturalWidth <= 1) setFailed(true)
  }
  // an image that settled before hydration fires no load event React can see: look once on mount
  useEffect(() => settle(heading.current?.querySelector("img")), [])

  return (
    <Tag ref={heading} className={classnames("heading", className)}>
      {!failed && (
        <Image
          src={image}
          alt={text}
          width={width}
          height={height}
          onLoad={(event) => settle(event.currentTarget)}
          onError={() => setFailed(true)}
        />
      )}
      <span className={failed ? undefined : "sr-only"}>{text}</span>
    </Tag>
  )
}
