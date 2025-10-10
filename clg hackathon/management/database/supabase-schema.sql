-- Full PostgreSQL schema for Supabase
-- This script creates all necessary tables for the Campus Companion application.
-- To use, navigate to the Supabase SQL Editor and paste this entire script.

-- Enable the uuid-ossp extension to generate UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table (from Supabase Auth)
-- This table is automatically created by Supabase Auth. 
-- We can add a public `profiles` table to store additional user data.
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(20) DEFAULT 'student' NOT NULL, -- 'student' or 'admin'
    photo_url VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function to create a profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, name, email, role, photo_url)
    VALUES (
        new.id,
        new.raw_user_meta_data->>'name',
        new.email,
        new.raw_user_meta_data->>'role',
        new.raw_user_meta_data->>'photo_url'
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function after a new user is created in auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 2. Unified Schedules Table
CREATE TABLE IF NOT EXISTS public.unified_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    year VARCHAR(10) NOT NULL,
    section VARCHAR(10) NOT NULL,
    date DATE NOT NULL,
    day VARCHAR(20) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    faculty VARCHAR(255),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(year, section, date, start_time)
);
CREATE INDEX IF NOT EXISTS idx_schedules_year_section ON public.unified_schedules(year, section);


-- 3. Events Table
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    date_text VARCHAR(100), -- For display purposes, e.g., "March 15-17"
    start_datetime TIMESTAMPTZ,
    end_datetime TIMESTAMPTZ,
    location VARCHAR(255),
    category VARCHAR(50),
    image_url VARCHAR(255),
    registration_open BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_events_category ON public.events(category);
CREATE INDEX IF NOT EXISTS idx_events_start_datetime ON public.events(start_datetime);


-- 4. Event Registrations Table
CREATE TABLE IF NOT EXISTS public.event_registrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    registered_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, event_id)
);


-- 5. Bus Routes Table
CREATE TABLE IF NOT EXISTS public.bus_routes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    route_description VARCHAR(255),
    departure_time TIME,
    time_of_day VARCHAR(20), -- 'morning' or 'evening'
    total_seats INT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- 6. Bus Bookings Table
CREATE TABLE IF NOT EXISTS public.bus_bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    bus_route_id UUID NOT NULL REFERENCES public.bus_routes(id) ON DELETE CASCADE,
    seat_number INT NOT NULL,
    booking_date DATE NOT NULL DEFAULT CURRENT_DATE,
    booking_time TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(bus_route_id, seat_number, booking_date)
);
CREATE INDEX IF NOT EXISTS idx_bus_bookings_user_date ON public.bus_bookings(user_id, booking_date);


-- 7. Campus Resources Table
CREATE TABLE IF NOT EXISTS public.campus_resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50),
    icon VARCHAR(10),
    location VARCHAR(255),
    floor VARCHAR(50),
    timing VARCHAR(100),
    phone VARCHAR(50),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_resources_type ON public.campus_resources(type);

-- 8. Row Level Security (RLS) Policies
-- Enable RLS for all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unified_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bus_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bus_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campus_resources ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Public Read Policies (for schedules, events, resources, bus routes)
CREATE POLICY "Allow public read access" ON public.unified_schedules FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON public.events FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON public.bus_routes FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON public.campus_resources FOR SELECT USING (true);

-- Authenticated User Policies (for bookings and registrations)
CREATE POLICY "Users can manage their own bookings" ON public.bus_bookings FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view all bus bookings" ON public.bus_bookings FOR SELECT USING (true);

CREATE POLICY "Users can manage their own event registrations" ON public.event_registrations FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view all event registrations" ON public.event_registrations FOR SELECT USING (true);

-- Admin-only Write Policies
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE POLICY "Admins can manage all schedules" ON public.unified_schedules FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admins can manage all events" ON public.events FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admins can manage all bus routes" ON public.bus_routes FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admins can manage all resources" ON public.campus_resources FOR ALL USING (is_admin()) WITH CHECK (is_admin());
