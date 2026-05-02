export default function classnames(...classes) {
  return classes.filter(Boolean).join(" ")
}
