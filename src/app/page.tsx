import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { loadState } from "@/server/state";
import App from "@/components/App";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const initial = loadState(session.user.id);
  return <App initial={initial} userName={session.user.name || ""} />;
}
