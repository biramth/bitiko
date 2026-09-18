-- The campaign email ends with a call-to-action button (dashboard by default).
-- Teams now get to configure both the label and the target URL per campaign;
-- the send step falls back to the dashboard when a field is left empty, so
-- existing campaigns are unaffected.
alter table public.campaigns
  add column button_label text,
  add column button_url text;

alter table public.campaigns
  add constraint campaigns_button_label_check check (char_length(button_label) <= 60),
  add constraint campaigns_button_url_check check (char_length(button_url) <= 2048);