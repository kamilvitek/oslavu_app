import { generateOIcon } from "@/lib/generate-o-icon";

export const size = {
  width: 192,
  height: 192,
};
export const contentType = "image/png";

export default function Icon() {
  return generateOIcon(size.width);
}
