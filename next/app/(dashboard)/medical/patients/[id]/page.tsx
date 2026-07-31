import { redirect } from "next/navigation";

export default async function PatientProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/medical?tab=patients&patientId=${encodeURIComponent(id)}`);
}
