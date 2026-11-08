import { notFound } from "next/navigation";

// The design language / style guide page is hidden per council request.
export const dynamic = "force-dynamic";

export default function StyleGuidePage() {
  notFound();
}
