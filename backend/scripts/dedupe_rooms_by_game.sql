WITH duplicates AS (
    SELECT
        game_id,
        name,
        MIN(id) AS keep_id,
        ARRAY_AGG(id) AS ids
    FROM rooms
    GROUP BY game_id, name
    HAVING COUNT(*) > 1
),
to_merge AS (
    SELECT
        game_id,
        name,
        keep_id,
        unnest(ids) AS room_id
    FROM duplicates
)
DELETE FROM room_members rm
USING to_merge d, room_members keep_rm
WHERE rm.room_id = d.room_id
  AND rm.room_id <> d.keep_id
  AND keep_rm.room_id = d.keep_id
  AND keep_rm.user_id = rm.user_id;

WITH duplicates AS (
    SELECT
        game_id,
        name,
        MIN(id) AS keep_id,
        ARRAY_AGG(id) AS ids
    FROM rooms
    GROUP BY game_id, name
    HAVING COUNT(*) > 1
),
to_merge AS (
    SELECT
        game_id,
        name,
        keep_id,
        unnest(ids) AS room_id
    FROM duplicates
),
dupe_members AS (
    SELECT
        rm.id,
        rm.user_id,
        rm.room_id,
        d.keep_id,
        ROW_NUMBER() OVER (
            PARTITION BY d.keep_id, rm.user_id
            ORDER BY rm.room_id
        ) AS rn
    FROM room_members rm
    JOIN to_merge d
      ON rm.room_id = d.room_id
    WHERE rm.room_id <> d.keep_id
)
DELETE FROM room_members rm
USING dupe_members dm
WHERE rm.id = dm.id
  AND dm.rn > 1;

WITH duplicates AS (
    SELECT
        game_id,
        name,
        MIN(id) AS keep_id,
        ARRAY_AGG(id) AS ids
    FROM rooms
    GROUP BY game_id, name
    HAVING COUNT(*) > 1
),
to_merge AS (
    SELECT
        game_id,
        name,
        keep_id,
        unnest(ids) AS room_id
    FROM duplicates
)
UPDATE room_members rm
SET room_id = d.keep_id
FROM to_merge d
WHERE rm.room_id = d.room_id
  AND rm.room_id <> d.keep_id;

WITH duplicates AS (
    SELECT
        game_id,
        name,
        MIN(id) AS keep_id,
        ARRAY_AGG(id) AS ids
    FROM rooms
    GROUP BY game_id, name
    HAVING COUNT(*) > 1
),
to_merge AS (
    SELECT
        game_id,
        name,
        keep_id,
        unnest(ids) AS room_id
    FROM duplicates
)
UPDATE game_sessions gs
SET room_id = d.keep_id
FROM to_merge d
WHERE gs.room_id = d.room_id
  AND gs.room_id <> d.keep_id;

WITH duplicates AS (
    SELECT
        game_id,
        name,
        MIN(id) AS keep_id,
        ARRAY_AGG(id) AS ids
    FROM rooms
    GROUP BY game_id, name
    HAVING COUNT(*) > 1
)
DELETE FROM rooms r
USING duplicates d
WHERE r.game_id = d.game_id
  AND r.name = d.name
  AND r.id <> d.keep_id;
