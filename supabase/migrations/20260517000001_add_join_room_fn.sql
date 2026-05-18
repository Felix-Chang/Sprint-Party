CREATE OR REPLACE FUNCTION join_room(p_room_id uuid, p_user_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE rooms
  SET players = array_append(players, p_user_id)
  WHERE id = p_room_id
    AND NOT (p_user_id = ANY(players));
END;
$$;
