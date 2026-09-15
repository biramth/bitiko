-- Lets a merchant tell customers how to actually pay them by Mobile Money
-- (Wave/Orange Money number, name on the account, or both) — free text
-- rather than separate name/number fields, since merchants phrase this
-- differently and some accept more than one provider.

alter table public.shops add column payment_instructions text;
