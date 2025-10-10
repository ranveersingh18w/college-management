-- Supabase / Postgres DDL for Events and Event Registrations
-- Location: management/db/supabase-events.sql
-- Paste this into Supabase SQL editor or run via psql

-- Enable uuid generator (may already be enabled in Supabase projects)
create extension if not exists "uuid-ossp";

-- EVENTS table
create table if not exists public.events (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text default ''::text,
  -- Structured start date/time (optional). Use ISO timestamps for sorting/filtering.
  start_date timestamptz,
  -- Optional end date for multi-day events
  end_date timestamptz,
  -- Human-readable date string for UI display (keeps compatibility with current frontend)
  human_date text,
  location text default ''::text,
  category text default 'technical',
  attendees text default ''::text,
  capacity integer,
  image text,
  registration_open boolean default true,
  created_by uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  meta jsonb default '{}'::jsonb
);

-- Trigger to update updated_at automatically
create or replace function public.update_updated_at_column()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trigger_set_updated_at on public.events;
create trigger trigger_set_updated_at
before update on public.events
for each row
execute procedure public.update_updated_at_column();

-- Indexes to support ordering and filtering
create index if not exists idx_events_start_date on public.events (start_date);
create index if not exists idx_events_category on public.events (category);

-- EVENT REGISTRATIONS table (maps users to events)
create table if not exists public.event_registrations (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid not null,
  event_id uuid not null references public.events(id) on delete cascade,
  student_name text,
  roll_number text,
  registered_at timestamptz default now(),
  status text default 'registered', -- e.g. registered, cancelled, waitlisted
  meta jsonb default '{}'::jsonb
);

create index if not exists idx_event_registrations_user on public.event_registrations (user_id);
create index if not exists idx_event_registrations_event on public.event_registrations (event_id);

-- Example seed rows (safe to run once)
insert into public.events (title, description, human_date, start_date, end_date, location, category, attendees, image, registration_open, capacity)
values
('TechFest 2025', 'Annual technical festival featuring workshops, competitions, and guest lectures', 'March 15-17, 2025', '2025-03-15T09:00:00Z', '2025-03-17T18:00:00Z', 'Main Auditorium', 'technical', '500 attendees expected', 'https://via.placeholder.com/400x200/667eea/ffffff?text=TechFest+2025', true, 1000),
('Robotics Workshop', 'Hands-on workshop on building autonomous robots with Arduino and sensors', 'March 20, 2025', '2025-03-20T10:00:00Z', null, 'Engineering Block', 'technical', '50 attendees expected', 'https://via.placeholder.com/400x200/764ba2/ffffff?text=Robotics+Workshop', true, 200),
('Cultural Night', 'Evening of music, dance, and cultural performances by students', 'March 23, 2025', '2025-03-23T18:00:00Z', null, 'Open Ground', 'cultural', '800 attendees expected', 'https://via.placeholder.com/400x200/ff6b6b/ffffff?text=Cultural+Night', true, 2000)
on conflict do nothing;

-- RLS notes (optional):
-- If you enable Row Level Security (RLS) you can allow public selects and restrict inserts/updates.
-- Example (run only if you want RLS enabled):
-- alter table public.events enable row level security;
-- create policy "public_read_events" on public.events for select using (true);
-- create policy "insert_events_authenticated" on public.events for insert with check (auth.role() = 'authenticated');

-- End of file
