import FacilityDetailClient from "./facility-detail-client";
import publicFacilities from "../../../lib/data/mumbai-suburban.public.json";

export function generateStaticParams() {
  return (publicFacilities as any[]).map((f: any) => ({
    id: f.id,
  }));
}

export default function FacilityDetailPage({ params }: { params: { id: string } }) {
  return <FacilityDetailClient facilityId={params.id} />;
}
