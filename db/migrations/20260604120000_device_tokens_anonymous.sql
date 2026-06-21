-- Allow guest device tokens for marketing push (client_id = __anonymous__).

comment on column public.device_tokens.client_id is
  'Client id, or __anonymous__ for logged-out app installs';
