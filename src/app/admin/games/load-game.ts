import "server-only";
import { notFound } from "next/navigation";
import { getGameForAdmin } from "@/lib/data/games";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function loadGame(id: string) {
  if (!UUID.test(id)) notFound();
  const game = await getGameForAdmin(id);
  if (!game) notFound();
  return game;
}
