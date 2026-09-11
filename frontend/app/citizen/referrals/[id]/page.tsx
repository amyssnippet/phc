import ReferralTimelineClient from "./referral-timeline-client";

export function generateStaticParams() {
  return [{ id: "demo" }, { id: "active" }];
}

export default function ReferralTimelinePage({ params }: { params: { id: string } }) {
  return <ReferralTimelineClient referralId={params.id} />;
}
