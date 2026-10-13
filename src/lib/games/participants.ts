// 参加者登録の保存内容を、今の登録と画面の入力から決める

export type ParticipantInput = { playerId: string; battingOrder: string };

export type ParticipantPlan =
  | {
      ok: true;
      upserts: { player_id: string; batting_order: number | null }[];
      deletes: string[]; // 外す選手(打席結果も一緒に消える)
    }
  | { ok: false; errors: Record<string, string> }; // player_id → エラー

export function planParticipants(currentPlayerIds: string[], submitted: ParticipantInput[]): ParticipantPlan {
  const errors: Record<string, string> = {};
  const seenOrders = new Map<number, string>();
  const upserts: { player_id: string; batting_order: number | null }[] = [];

  for (const s of submitted) {
    const raw = s.battingOrder.trim().replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
    let order: number | null = null;
    if (raw !== "") {
      order = Number(raw);
      if (!/^\d{1,2}$/.test(raw) || order < 1 || order > 30) {
        errors[s.playerId] = "打順は1〜30で入力してください。";
        continue;
      }
      const dup = seenOrders.get(order);
      if (dup) {
        errors[s.playerId] = `打順 ${order} が重なっています。`;
        errors[dup] ??= `打順 ${order} が重なっています。`;
        continue;
      }
      seenOrders.set(order, s.playerId);
    }
    upserts.push({ player_id: s.playerId, batting_order: order });
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  const keep = new Set(submitted.map((s) => s.playerId));
  return { ok: true, upserts, deletes: currentPlayerIds.filter((id) => !keep.has(id)) };
}

// 試合日に在籍している正規メンバーか
export function enrolledOn(p: { kind: string; joined_on: string | null; left_on: string | null }, date: string): boolean {
  return p.kind === "regular" && p.joined_on !== null && p.joined_on <= date && (p.left_on === null || p.left_on >= date);
}
