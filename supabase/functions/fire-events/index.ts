import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type EventType = "task_swap" | "mystery_bonus" | "team_up" | "blitz" | "bounty";

interface GameEvent {
  id: string;
  type: EventType;
  triggeredAt: string;
  targetPlayers: string[];
  resolved: boolean;
  data: Record<string, unknown>;
}

interface Room {
  id: string;
  players: string[];
  status: string;
  events: GameEvent[] | null;
  settings: { eventsEnabled: boolean };
  week_start: string | null;
}

const EVENT_POOL: EventType[] = [
  "task_swap",
  "mystery_bonus",
  "team_up",
  "blitz",
  "bounty",
];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function alreadyFiredToday(events: GameEvent[]): boolean {
  const today = new Date().toISOString().slice(0, 10);
  return events.some((e) => e.triggeredAt.slice(0, 10) === today);
}

function isEventDay(weekStart: string | null): boolean {
  if (!weekStart) return false;
  const elapsed = Math.floor(
    (Date.now() - new Date(weekStart).getTime()) / 86_400_000
  );
  return elapsed > 0 && elapsed % 2 === 1;
}

function endOfDayUTC(): string {
  const d = new Date();
  d.setUTCHours(23, 59, 59, 999);
  return d.toISOString();
}

function buildEvent(
  type: EventType,
  targetPlayers: string[],
  data: Record<string, unknown>
): GameEvent {
  return {
    id: crypto.randomUUID(),
    type,
    triggeredAt: new Date().toISOString(),
    targetPlayers,
    resolved: false,
    data,
  };
}

function buildEventForRoom(type: EventType, players: string[]): GameEvent {
  const DIFF_LABELS: Record<number, string> = { 1: "Easy", 2: "Medium", 3: "Hard" };

  switch (type) {
    case "task_swap":
      return buildEvent(type, players, {
        choices: {},
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        note: "Each player can offload one of their tasks to another player.",
      });

    case "mystery_bonus": {
      const difficulty = randomItem([1, 2, 3]);
      return buildEvent(type, players, {
        difficulty,
        bonusPoints: 100,
        expiresAt: endOfDayUTC(),
        note: `${DIFF_LABELS[difficulty]} tasks earn +100 pts today!`,
      });
    }

    case "team_up": {
      const shuffled = [...players].sort(() => Math.random() - 0.5);
      const mid = Math.ceil(shuffled.length / 2);
      return buildEvent(type, players, {
        teams: { magenta: shuffled.slice(0, mid), lime: shuffled.slice(mid) },
        bonusPoints: 300,
        expiresAt: endOfDayUTC(),
        note: "Lobby split into teams. Winning team earns 300 pts each.",
      });
    }

    case "blitz":
      return buildEvent(type, players, {
        bonusPoints: 50,
        expiresAt: endOfDayUTC(),
        note: "All task completions earn +50 bonus pts today!",
      });

    case "bounty":
      return buildEvent(type, players, {
        targetPlayerId: randomItem(players),
        stealPoints: 200,
        bonusPoints: 300,
        expiresAt: endOfDayUTC(),
        note: "Beat the target's task count to steal 200 pts.",
      });
  }
}

async function processRoom(
  supabase: ReturnType<typeof createClient>,
  room: Room
): Promise<{ roomId: string; status: string }> {
  if (!isEventDay(room.week_start)) {
    return { roomId: room.id, status: "skipped_not_event_day" };
  }

  const existingEvents = room.events ?? [];

  if (alreadyFiredToday(existingEvents)) {
    return { roomId: room.id, status: "skipped_already_fired_today" };
  }

  const eventType = randomItem(EVENT_POOL);
  const newEvent = buildEventForRoom(eventType, room.players);

  const { error } = await supabase
    .from("rooms")
    .update({ events: [...existingEvents, newEvent] })
    .eq("id", room.id);

  if (error) {
    console.error(`[fire-events] Failed to write event for room ${room.id}`, error);
    return { roomId: room.id, status: "error_writing_event" };
  }

  return { roomId: room.id, status: `fired_${newEvent.type}` };
}

Deno.serve(async (req: Request) => {
  const cronSecret = Deno.env.get("CRON_SECRET");
  const authHeader = req.headers.get("Authorization");

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  const { data: rooms, error } = await supabase
    .from("rooms")
    .select("id, players, status, events, settings, week_start")
    .eq("status", "active");

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const eligible = (rooms as Room[]).filter(
    (r) => r.settings?.eventsEnabled === true
  );

  const results = await Promise.all(
    eligible.map((room) => processRoom(supabase, room))
  );

  return new Response(
    JSON.stringify({ processed: results.length, results }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
});
