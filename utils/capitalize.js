export default function capitalize(val) {
  if (typeof val !== "string") val = "";
  return val.charAt(0).toUpperCase() + val.substring(1);
}
