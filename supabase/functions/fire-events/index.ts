import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type EventType =
  | "task_swap"
  | "double_or_nothing"
  | "sabotage"
  | "mystery_bonus"
  | "point_heist"
  | "freeze";

interface Task {
  id: string;
  title: string;
  difficulty: 1 | 2 | 3;
  completed: boolean;
  completedAt: string | null;
  addedAt: string;
  originPlayerId: string;
  bonusApplied: string | null;
}

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
}

interface Player {
  user_id: string;
  room_id: string;
  tasks: Task[] | null;
}

const EVENT_POOL: EventType[] = [
  "task_swap",
  "double_or_nothing",
  "sabotage",
  "mystery_bonus",
  "point_heist",
  "freeze",
];

const MYSTERY_CONDITIONS = [
  "Most tasks completed on a single day",
  "First to finish a task after this event fired",
  "Completed a task between midnight and 6am",
  "Completed a task within 1 hour of a teammate",
];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function alreadyFiredToday(events: GameEvent[]): boolean {
  const today = new Date().toISOString().slice(0, 10);
  return events.some((e) => e.triggeredAt.slice(0, 10) === today);
}

function buildEvent(
  type: EventType,
  targetPlayers: string[],
  resolved: boolean,
  data: Record<string, unknown>
): GameEvent {
  return {
    id: crypto.randomUUID(),
    type,
    triggeredAt: new Date().toISOString(),
    targetPlayers,
    resolved,
    data,
  };
}

async function executeTaskSwap(
  supabase: ReturnType<typeof createClient>,
  room: Room,
  players: Player[]
): Promise<GameEvent | null> {
  const eligible = players.filter(
    (p) => (p.tasks ?? []).some((t) => !t.completed)
  );

  if (eligible.length < 2) return null;

  const [playerA, playerB] = [...eligible]
    .sort(() => Math.random() - 0.5)
    .slice(0, 2);

  const taskFromA = randomItem(
    (playerA.tasks ?? []).filter((t) => !t.completed)
  );
  const taskFromB = randomItem(
    (playerB.tasks ?? []).filter((t) => !t.completed)
  );

  const newTasksA = [
    ...(playerA.tasks ?? []).filter((t) => t.id !== taskFromA.id),
    { ...taskFromB, originPlayerId: playerB.user_id },
  ];
  const newTasksB = [
    ...(playerB.tasks ?? []).filter((t) => t.id !== taskFromB.id),
    { ...taskFromA, originPlayerId: playerA.user_id },
  ];

  const [resA, resB] = await Promise.all([
    supabase
      .from("players")
      .update({ tasks: newTasksA })
      .eq("user_id", playerA.user_id)
      .eq("room_id", room.id),
    supabase
      .from("players")
      .update({ tasks: newTasksB })
      .eq("user_id", playerB.user_id)
      .eq("room_id", room.id),
  ]);

  if (resA.error || resB.error) return null;

  return buildEvent("task_swap", [playerA.user_id, playerB.user_id], true, {
    swaps: [
      {
        fromPlayer: playerA.user_id,
        toPlayer: playerB.user_id,
        taskTitle: taskFromA.title,
      },
      {
        fromPlayer: playerB.user_id,
        toPlayer: playerA.user_id,
        taskTitle: taskFromB.title,
      },
    ],
    note: "Two players had their tasks swapped!",
  });
}

function buildGenericEvent(type: EventType, players: string[]): GameEvent {
  switch (type) {
    case "double_or_nothing":
      return buildEvent(type, players, false, {
        deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        note: "Pick a task — finish in 24h for 2x points or lose the base points.",
      });
    case "sabotage":
      return buildEvent(type, players, false, {
        note: "Each player can assign a small task to one opponent.",
      });
    case "mystery_bonus":
      return buildEvent(type, players, false, {
        condition: randomItem(MYSTERY_CONDITIONS),
        note: "A hidden scoring condition will be revealed at end of week.",
      });
    case "point_heist":
      return buildEvent(type, players, false, {
        pointsToSteal: 2,
        note: "Each player can steal 2 points from any opponent. Shields block this.",
      });
    case "freeze":
      return buildEvent(type, players, false, {
        note: "Pick one opponent — their next task completion awards 0 points.",
      });
    default:
      return buildEvent(type, players, false, { note: "" });
  }
}

async function processRoom(
  supabase: ReturnType<typeof createClient>,
  room: Room
): Promise<{ roomId: string; status: string }> {
  const existingEvents = room.events ?? [];

  if (alreadyFiredToday(existingEvents)) {
    return { roomId: room.id, status: "skipped_already_fired_today" };
  }

  let eventType = randomItem(EVENT_POOL);
  let newEvent: GameEvent | null = null;

  if (eventType === "task_swap") {
    const { data: players, error } = await supabase
      .from("players")
      .select("user_id, room_id, tasks")
      .eq("room_id", room.id);

    if (!error && players) {
      newEvent = await executeTaskSwap(supabase, room, players as Player[]);
    }

    if (!newEvent) {
      // Fall back to a non-swap event if swap couldn't execute
      eventType = randomItem(EVENT_POOL.filter((e) => e !== "task_swap"));
      newEvent = buildGenericEvent(eventType, room.players);
    }
  } else {
    newEvent = buildGenericEvent(eventType, room.players);
  }

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
    .select("id, players, status, events, settings")
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
