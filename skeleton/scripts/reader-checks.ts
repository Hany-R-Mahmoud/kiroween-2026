// The reader-role check lists, as data, so a unit test can hold them to the privilege list without a database.
// Refusals must come back as SQLSTATE 42501 (insufficient privilege).
export const REFUSED: [string, string][] = [
  ['legends.model is refused', 'select model from legends limit 1'],
  ['legends.final_puzzle is refused', 'select final_puzzle from legends limit 1'],
  ['assets.prompt is refused', 'select prompt from assets limit 1'],
  ['runs is refused', 'select count(*) from runs'],
  ['facts is refused', 'select count(*) from facts'],
  ['neon_auth."user" is refused', 'select count(*) from neon_auth."user"'],
  ['keepers_note_details is refused', 'select count(*) from keepers_note_details'],
  ['player_flags is refused', 'select count(*) from player_flags'],
  ['an INSERT into legends is refused', "insert into legends (id) values ('reader-role-check')"],
  ['an UPDATE of chapters is refused', "update chapters set title = title where id = 'none'"],
  ['a DELETE from versions is refused', "delete from versions where id = 'none'"],
  ['an INSERT into keepers_note is refused', "insert into keepers_note (id) values ('reader-role-check')"],
  ['an UPDATE of keepers_note is refused', "update keepers_note set title = title where id = 'none'"],
  ['a DELETE from keepers_note is refused', "delete from keepers_note where id = 'none'"],
  ['CREATE TABLE in public is refused', 'create table reader_role_check (x int)'],
];

/** Tables the reader role can read whole; each must hold at least one row. */
export const READABLE_TABLES = ['chapters', 'versions', 'documented_told', 'sources', 'anchors', 'keepers_note'] as const;

/** The exact privilege list the reader role holds (tech-decisions.md and the migration grants), normalised. */
export const EXPECTED_GRANTS: string[] = [
  'select (id, title, region, map_lat, map_lng, era, scare_level, reading_time_min, one_line_hook, cold_open, documented_closing, theme) on legends',
  'select on chapters, versions, documented_told, sources, anchors',
  'select (legend_id, id, usage, size) on assets',
  'select on keepers_note',
];
