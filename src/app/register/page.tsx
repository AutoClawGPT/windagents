import { RegisterClient } from "./RegisterClient";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const sp = await searchParams;
  const initialMode = sp.mode === "agent" ? "agent" : "human";
  return <RegisterClient initialMode={initialMode} />;
}
