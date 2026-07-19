-- National weekly day-off preset (ISO weekdays 1=Mon … 7=Sun).
-- Copied into school_calendars.weekly_offs at school calendar setup;
-- school/tenant admins may change their copy later. Does not alter teaching_days
-- directly — schools still use their own weekly_offs column.

ALTER TABLE national_calendars
  ADD COLUMN weekly_offs smallint[] NOT NULL DEFAULT '{6}';

COMMENT ON COLUMN national_calendars.weekly_offs IS
  'National weekly day-off preset (ISO DOW). Schools inherit at setup; '
  'school_calendars.weekly_offs remains the school override.';
