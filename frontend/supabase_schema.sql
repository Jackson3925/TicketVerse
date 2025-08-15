--
-- PostgreSQL database dump
--

\restrict yUtW5ZrGxexa5Z448qmSxbaFYR9zSzls9ivnriP3wA3sy0OF5mJxb6Cddasmpa6

-- Dumped from database version 17.4
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: check_wallet_for_auth(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_wallet_for_auth(wallet_addr text) RETURNS TABLE(user_id uuid, user_type text, display_name text, email text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$BEGIN
  -- First check buyers table
  RETURN QUERY
  SELECT 
    u.id as user_id,
    u.user_type,
    u.display_name,
    u.email
  FROM users u
  INNER JOIN buyers b ON u.id = b.id
  WHERE lower(cast(b.wallet_address as text)) = lower(wallet_addr)
  LIMIT 1;
  
  -- If not found in buyers, check sellers table
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      u.id as user_id,
      u.user_type,
      u.display_name,
      u.email
    FROM users u
    INNER JOIN sellers s ON u.id = s.id
    WHERE lower(cast(s.wallet_address as text)) = lower(wallet_addr)
    LIMIT 1;
  END IF;
  
  RETURN;
END;$$;


--
-- Name: FUNCTION check_wallet_for_auth(wallet_addr text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.check_wallet_for_auth(wallet_addr text) IS 'Check if wallet address exists and return basic user info for authentication';


--
-- Name: confirm_seat_purchase(uuid, uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.confirm_seat_purchase(p_event_id uuid, p_user_id uuid, p_order_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  DECLARE
      seat_record record;
      ticket_id_var uuid;
  BEGIN
      FOR seat_record IN
          SELECT sa.*, sc.row_prefix
          FROM public.seat_assignments sa
          JOIN public.seat_categories sc ON sa.seat_category_id = sc.id
          WHERE sa.event_id = p_event_id
          AND sa.reserved_by = p_user_id
          AND sa.reserved_until > now()
      LOOP
          -- Mark seat as sold
          UPDATE public.seat_assignments
          SET
              is_available = false,
              reserved_until = NULL,
              reserved_by = NULL
          WHERE id = seat_record.id;

          -- Find the ticket to update (PostgreSQL compatible way)
          SELECT id INTO ticket_id_var
          FROM public.tickets
          WHERE order_id = p_order_id
          AND seat_category_id = seat_record.seat_category_id
          AND seat_row IS NULL
          LIMIT 1;

          -- Update ticket with seat info
          IF ticket_id_var IS NOT NULL THEN
              UPDATE public.tickets
              SET
                  seat_row = seat_record.row_prefix || seat_record.row_number,
                  seat_number = seat_record.seat_number::text
              WHERE id = ticket_id_var;

              -- Link ticket to seat assignment
              UPDATE public.seat_assignments
              SET ticket_id = ticket_id_var
              WHERE id = seat_record.id;
          END IF;
      END LOOP;
  END;
  $$;


--
-- Name: create_user_profile(uuid, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_user_profile(user_id uuid, user_email text, display_name text, user_type text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Validate input parameters
  IF user_id IS NULL THEN
    RAISE EXCEPTION 'user_id cannot be null';
  END IF;
  
  IF user_email IS NULL OR user_email = '' THEN
    RAISE EXCEPTION 'user_email cannot be null or empty';
  END IF;
  
  IF user_type NOT IN ('buyer', 'seller') THEN
    RAISE EXCEPTION 'user_type must be either buyer or seller, got: %', user_type;
  END IF;

  -- Insert into users table
  INSERT INTO public.users (id, email, display_name, user_type, created_at, updated_at)
  VALUES (user_id, user_email, COALESCE(display_name, ''), user_type, now(), now());
  
  -- Insert into role-specific table
  IF user_type = 'seller' THEN
    INSERT INTO public.sellers (id, created_at, updated_at) 
    VALUES (user_id, now(), now());
  ELSE
    INSERT INTO public.buyers (id, created_at, updated_at) 
    VALUES (user_id, now(), now());
  END IF;
  
  -- Log successful creation
  RAISE NOTICE 'Successfully created profile for user % with type %', user_id, user_type;
END;
$$;


--
-- Name: create_wallet_user_for_auth(text, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_wallet_user_for_auth(wallet_addr text, user_email text, user_display_name text, user_user_type text DEFAULT 'buyer'::text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  new_user_id uuid;
  result json;
BEGIN
  -- Generate a new UUID for the user
  new_user_id := gen_random_uuid();
  
  -- Insert into users table
  INSERT INTO public.users (
    id,
    email,
    display_name,
    user_type,
    created_at,
    updated_at
  ) VALUES (
    new_user_id,
    user_email,
    user_display_name,
    user_user_type,
    now(),
    now()
  );
  
  -- Create corresponding buyer or seller record
  IF user_user_type = 'buyer' THEN
    INSERT INTO public.buyers (
      id, 
      wallet_address, 
      wallet_verified, 
      created_at, 
      updated_at
    ) VALUES (
      new_user_id, 
      lower(wallet_addr), 
      true, 
      now(), 
      now()
    );
  ELSIF user_user_type = 'seller' THEN
    INSERT INTO public.sellers (
      id, 
      wallet_address, 
      wallet_verified, 
      created_at, 
      updated_at
    ) VALUES (
      new_user_id, 
      lower(wallet_addr), 
      true, 
      now(), 
      now()
    );
  END IF;
  
  -- Return the created user profile
  result := public.get_wallet_user_profile(wallet_addr);
  RETURN result;
END;
$$;


--
-- Name: FUNCTION create_wallet_user_for_auth(wallet_addr text, user_email text, user_display_name text, user_user_type text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.create_wallet_user_for_auth(wallet_addr text, user_email text, user_display_name text, user_user_type text) IS 'Create new user account with wallet address for Web3 authentication';


--
-- Name: get_wallet_user_profile(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_wallet_user_profile(wallet_addr text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$DECLARE
  result json;
BEGIN
  -- Try to get buyer profile first
  SELECT json_build_object(
    'id', u.id,
    'email', u.email,
    'display_name', u.display_name,
    'user_type', u.user_type,
    'created_at', u.created_at,
    'updated_at', u.updated_at,
    'buyer_profile', json_build_object(
      'id', b.id,
      'bio', b.bio,
      'location', b.location,
      'wallet_address', b.wallet_address,
      'wallet_balance', b.wallet_balance,
      'wallet_verified', b.wallet_verified,
      'tickets_purchased', b.tickets_purchased,
      'events_attended', b.events_attended,
      'nft_tickets_owned', b.nft_tickets_owned,
      'community_rating', b.community_rating,
      'member_since', b.member_since,
      'notification_event_reminders', b.notification_event_reminders,
      'notification_ticket_updates', b.notification_ticket_updates,
      'notification_price_alerts', b.notification_price_alerts,
      'notification_marketing_emails', b.notification_marketing_emails,
      'preferred_genres', b.preferred_genres,
      'favorite_venues', b.favorite_venues,
      'created_at', b.created_at,
      'updated_at', b.updated_at
    )
  ) INTO result
  FROM users u
  INNER JOIN buyers b ON u.id = b.id
  WHERE lower(cast(b.wallet_address as text)) = lower(wallet_addr);
  
  -- If found as buyer, return result
  IF result IS NOT NULL THEN
    RETURN result;
  END IF;
  
  -- Try to get seller profile
  SELECT json_build_object(
    'id', u.id,
    'email', u.email,
    'display_name', u.display_name,
    'user_type', u.user_type,
    'created_at', u.created_at,
    'updated_at', u.updated_at,
    'seller_profile', json_build_object(
      'id', s.id,
      'business_name', s.business_name,
      'business_description', s.business_description,
      'business_website', s.business_website,
      'business_email', s.business_email,
      'business_phone', s.business_phone,
      'business_address', s.business_address,
      'tax_id', s.tax_id,
      'wallet_address', s.wallet_address,
      'wallet_balance', s.wallet_balance,
      'wallet_verified', s.wallet_verified,
      'events_created', s.events_created,
      'total_revenue', s.total_revenue,
      'verification_status', s.verification_status,
      'verification_documents', s.verification_documents,
      'stripe_account_id', s.stripe_account_id,
      'payout_enabled', s.payout_enabled,
      'notification_new_orders', s.notification_new_orders,
      'notification_event_updates', s.notification_event_updates,
      'notification_payment_updates', s.notification_payment_updates,
      'notification_marketing_emails', s.notification_marketing_emails,
      'created_at', s.created_at,
      'updated_at', s.updated_at
    )
  ) INTO result
  FROM users u
  INNER JOIN sellers s ON u.id = s.id
  WHERE lower(cast(s.wallet_address as text)) = lower(wallet_addr);
  
  RETURN result;
END;$$;


--
-- Name: FUNCTION get_wallet_user_profile(wallet_addr text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_wallet_user_profile(wallet_addr text) IS 'Get full user profile by wallet address for authenticated users';


--
-- Name: initialize_seats_for_category(uuid, uuid, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.initialize_seats_for_category(p_event_id uuid, p_seat_category_id uuid, p_total_rows integer, p_seats_per_row integer) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  DECLARE
      row_num integer;
      seat_num integer;
  BEGIN
      FOR row_num IN 1..p_total_rows LOOP
          FOR seat_num IN 1..p_seats_per_row LOOP
              INSERT INTO public.seat_assignments (
                  event_id,
                  seat_category_id,
                  row_number,
                  seat_number
              ) VALUES (
                  p_event_id,
                  p_seat_category_id,
                  row_num,
                  seat_num
              );
          END LOOP;
      END LOOP;
  END;
  $$;


--
-- Name: reserve_seats_auto(uuid, uuid, integer, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.reserve_seats_auto(p_event_id uuid, p_seat_category_id uuid, p_quantity integer, p_user_id uuid) RETURNS TABLE(row_number integer, seat_number integer, display_seat text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  DECLARE
      reservation_expiry timestamp with time zone;
      seat_record record;
      row_prefix_val text;
  BEGIN
      -- Get row prefix for display
      SELECT row_prefix INTO row_prefix_val
      FROM public.seat_categories
      WHERE id = p_seat_category_id;

      reservation_expiry := now() + interval '10 minutes';

      -- Clear expired reservations
      UPDATE public.seat_assignments
      SET reserved_until = NULL, reserved_by = NULL
      WHERE reserved_until < now();

      -- Reserve available seats
      FOR seat_record IN
          SELECT sa.id, sa.row_number, sa.seat_number
          FROM public.seat_assignments sa
          WHERE sa.event_id = p_event_id
          AND sa.seat_category_id = p_seat_category_id
          AND sa.is_available = true
          AND sa.reserved_until IS NULL
          ORDER BY sa.row_number, sa.seat_number
          LIMIT p_quantity
      LOOP
          UPDATE public.seat_assignments
          SET
              reserved_until = reservation_expiry,
              reserved_by = p_user_id
          WHERE id = seat_record.id;

          RETURN QUERY SELECT
              seat_record.row_number,
              seat_record.seat_number,
              (row_prefix_val || seat_record.row_number || '-' || seat_record.seat_number)::text;
      END LOOP;
  END;
  $$;


--
-- Name: trigger_create_seats(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_create_seats() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.total_rows > 0 AND NEW.seats_per_row > 0 THEN
        PERFORM initialize_seats_for_category(
            NEW.event_id, 
            NEW.id, 
            NEW.total_rows, 
            NEW.seats_per_row
        );
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: update_event_sold_tickets(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_event_sold_tickets() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
  BEGIN
    IF NEW.status = 'confirmed' AND (OLD IS NULL OR OLD.status != 'confirmed') THEN
      -- Increment sold tickets
      UPDATE public.events
      SET sold_tickets = sold_tickets + NEW.quantity
      WHERE id = NEW.event_id;

      -- Update seat category sold count
      UPDATE public.seat_categories
      SET sold = sold + NEW.quantity
      WHERE id = NEW.seat_category_id;

    ELSIF OLD.status = 'confirmed' AND NEW.status != 'confirmed' THEN
      -- Decrement sold tickets (refund/cancellation)
      UPDATE public.events
      SET sold_tickets = GREATEST(0, sold_tickets - NEW.quantity)
      WHERE id = NEW.event_id;

      -- Update seat category sold count
      UPDATE public.seat_categories
      SET sold = GREATEST(0, sold - NEW.quantity)
      WHERE id = NEW.seat_category_id;
    END IF;

    RETURN NEW;
  END;
  $$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: artists; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.artists (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    genre text,
    image_url text,
    description text,
    followers integer DEFAULT 0,
    verified boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: buyers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.buyers (
    id uuid NOT NULL,
    bio text,
    location text,
    wallet_address text,
    wallet_balance numeric(18,8) DEFAULT 0,
    wallet_verified boolean DEFAULT false,
    tickets_purchased integer DEFAULT 0,
    events_attended integer DEFAULT 0,
    nft_tickets_owned integer DEFAULT 0,
    community_rating numeric(3,2) DEFAULT 0,
    member_since timestamp with time zone DEFAULT now(),
    notification_event_reminders boolean DEFAULT true,
    notification_ticket_updates boolean DEFAULT true,
    notification_price_alerts boolean DEFAULT true,
    notification_marketing_emails boolean DEFAULT false,
    preferred_genres text[],
    favorite_venues text[],
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    description text,
    artist_id uuid,
    venue_id uuid,
    seller_id uuid,
    date date NOT NULL,
    "time" time without time zone NOT NULL,
    doors_open time without time zone,
    category text NOT NULL,
    age_restriction text,
    dress_code text,
    duration_minutes integer,
    poster_image_url text,
    seat_arrangement_image_url text,
    total_tickets integer DEFAULT 0,
    sold_tickets integer DEFAULT 0,
    is_featured boolean DEFAULT false,
    status text DEFAULT 'active'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    contract_event_id integer,
    CONSTRAINT events_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'sold_out'::text, 'cancelled'::text, 'completed'::text])))
);


--
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    buyer_id uuid,
    event_id uuid,
    seat_category_id uuid,
    quantity integer NOT NULL,
    unit_price numeric(10,6) NOT NULL,
    total_price numeric(10,6) NOT NULL,
    transaction_hash text,
    status text DEFAULT 'pending'::text,
    purchase_date timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT orders_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'failed'::text, 'refunded'::text])))
);


--
-- Name: resale_listings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.resale_listings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_id uuid,
    seller_id uuid,
    original_price numeric NOT NULL,
    resale_price numeric NOT NULL,
    status text DEFAULT 'active'::text,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    sold_at timestamp with time zone,
    CONSTRAINT resale_listings_status_check CHECK ((status = ANY (ARRAY['active'::text, 'sold'::text, 'cancelled'::text, 'expired'::text])))
);


--
-- Name: resale_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.resale_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid,
    seller_id uuid,
    resale_enabled boolean DEFAULT true,
    max_resale_price_multiplier numeric(3,2) DEFAULT 2.0,
    royalty_percentage numeric(5,2) DEFAULT 5.0,
    transfer_restrictions text[],
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: seat_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.seat_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    seat_category_id uuid NOT NULL,
    row_number integer NOT NULL,
    seat_number integer NOT NULL,
    is_available boolean DEFAULT true,
    reserved_until timestamp with time zone,
    reserved_by uuid,
    ticket_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: seat_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.seat_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid,
    name text NOT NULL,
    price numeric(10,6) NOT NULL,
    capacity integer NOT NULL,
    sold integer DEFAULT 0,
    color text,
    nft_image_url text,
    created_at timestamp with time zone DEFAULT now(),
    total_rows integer DEFAULT 1,
    seats_per_row integer DEFAULT 10,
    row_prefix text DEFAULT 'R'::text
);


--
-- Name: seat_availability; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.seat_availability AS
 SELECT sc.event_id,
    sc.id AS seat_category_id,
    sc.name AS category_name,
    sc.price,
    sc.total_rows,
    sc.seats_per_row,
    sc.row_prefix,
    count(sa.id) AS total_seats,
    count(
        CASE
            WHEN (sa.is_available AND (sa.reserved_until IS NULL)) THEN 1
            ELSE NULL::integer
        END) AS available_seats,
    count(
        CASE
            WHEN (sa.reserved_until > now()) THEN 1
            ELSE NULL::integer
        END) AS reserved_seats,
    count(
        CASE
            WHEN (NOT sa.is_available) THEN 1
            ELSE NULL::integer
        END) AS sold_seats
   FROM (public.seat_categories sc
     LEFT JOIN public.seat_assignments sa ON ((sc.id = sa.seat_category_id)))
  GROUP BY sc.event_id, sc.id, sc.name, sc.price, sc.total_rows, sc.seats_per_row, sc.row_prefix;


--
-- Name: sellers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sellers (
    id uuid NOT NULL,
    business_name text,
    business_type text,
    bio text,
    location text,
    contact_phone text,
    tax_id text,
    wallet_address text,
    wallet_balance numeric(18,8) DEFAULT 0,
    wallet_verified boolean DEFAULT false,
    events_created integer DEFAULT 0,
    total_revenue numeric(12,2) DEFAULT 0,
    average_rating numeric(3,2) DEFAULT 0,
    verified_seller boolean DEFAULT false,
    commission_rate numeric(5,2) DEFAULT 5.0,
    notification_new_orders boolean DEFAULT true,
    notification_customer_messages boolean DEFAULT true,
    notification_payout_updates boolean DEFAULT true,
    notification_marketing_emails boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT sellers_business_type_check CHECK ((business_type = ANY (ARRAY['individual'::text, 'company'::text, 'venue'::text])))
);


--
-- Name: tickets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tickets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    token_id bigint,
    order_id uuid,
    event_id uuid,
    seat_category_id uuid,
    owner_id uuid,
    ticket_number text,
    qr_code text,
    seat_row text,
    seat_number text,
    is_used boolean DEFAULT false,
    used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    transferred_at timestamp with time zone
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid NOT NULL,
    email text NOT NULL,
    display_name text,
    avatar_url text,
    user_type text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT users_user_type_check CHECK ((user_type = ANY (ARRAY['buyer'::text, 'seller'::text])))
);


--
-- Name: venues; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.venues (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    address text NOT NULL,
    city text NOT NULL,
    state text,
    country text NOT NULL,
    capacity integer,
    parking_available boolean DEFAULT false,
    accessibility_features text[],
    created_at timestamp with time zone DEFAULT now()
);


--
-- Data for Name: artists; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.artists (id, name, genre, image_url, description, followers, verified, created_at, updated_at) FROM stdin;
cc684e3e-b667-4be0-ab69-4c43ecc58773	Yuna	Pop	\N	Malaysian singer-songwriter known for her soulful voice and international collaborations.	1200000	t	2025-06-25 06:20:26.389104+00	2025-06-25 06:20:26.389104+00
95d1b5ff-1fec-4563-9c1b-711dabb69ace	Jacky Cheung	Pop	data:image/webp;base64,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	Jacky Cheung Hok-yau is a Hong Kong singer and actor. One of the most influential artists in the Greater China region, Cheung is widely regarded as a Heavenly King of Cantopop music and an icon of Hong Kong popular culture. He is often dubbed as the "God of Songs" for his vocal delivery and live performances	0	f	2025-08-15 07:10:03.241673+00	2025-08-15 07:10:03.241673+00
789fd979-819a-42bf-b14f-c634bffd65f9	JJ Lin	Pop	data:image/jpeg;base64,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	JJ Lin (林俊傑) is a highly acclaimed Singaporean singer, songwriter, record producer, and actor, known for his work in the Mandopop music scene. He's recognized for his powerful vocals, emotional ballads, and skillful songwriting.	0	f	2025-08-15 09:22:51.640129+00	2025-08-15 09:22:51.640129+00
\.


--
-- Data for Name: buyers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.buyers (id, bio, location, wallet_address, wallet_balance, wallet_verified, tickets_purchased, events_attended, nft_tickets_owned, community_rating, member_since, notification_event_reminders, notification_ticket_updates, notification_price_alerts, notification_marketing_emails, preferred_genres, favorite_venues, created_at, updated_at) FROM stdin;
d10cca12-1950-4047-afa1-c2748f714638	\N	\N	0x09db4b8febcb8ff6f242b102c2dddd53e24832a8	0.96270703	t	0	0	0	0.00	2025-07-23 16:12:00.606016+00	t	t	t	f	\N	\N	2025-07-23 16:12:00.606016+00	2025-07-23 16:12:00.606016+00
8c605324-ca69-459f-8685-dadf724e7df5	\N	\N	0xdbd91d3818776fe030b7a677ef3316d3ae0ecf6c	0.29339785	t	0	0	0	0.00	2025-08-15 04:35:21.356437+00	t	t	t	f	\N	\N	2025-08-15 04:35:21.356437+00	2025-08-15 04:35:21.356437+00
32653a94-b6d1-423c-a1d6-e455ca154c37	\N	\N	\N	0.00000000	f	0	0	0	0.00	2025-08-15 10:44:37.920282+00	t	t	t	f	\N	\N	2025-08-15 10:44:37.920282+00	2025-08-15 10:44:37.920282+00
0af461ad-0380-4e8a-afd6-aba9f0dd01e1	\N	\N	0xc47083adce306936147408d873af596e443a036d	0.00000000	f	0	0	0	0.00	2025-07-23 08:45:40.951969+00	t	t	t	f	\N	\N	2025-07-23 08:45:40.951969+00	2025-07-23 08:45:40.951969+00
28e0f27d-2868-4f51-8f31-f84f359a3e1e	\N	\N	0x9962a7ae71a2eee9d0198cb918e7aaccc168990e	0.64840560	t	0	0	0	0.00	2025-08-15 07:50:01.017443+00	t	t	t	f	\N	\N	2025-08-15 07:50:01.017443+00	2025-08-15 07:50:01.017443+00
5214faac-b264-47df-b7b8-f95b77d765d9	\N	\N	0x7a635a37df8076c7542b5478e29476f480341226	0.00000000	t	0	0	0	0.00	2025-08-15 08:00:31.51273+00	t	t	t	f	\N	\N	2025-08-15 08:00:31.51273+00	2025-08-15 08:00:31.51273+00
\.


--
-- Data for Name: events; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.events (id, title, description, artist_id, venue_id, seller_id, date, "time", doors_open, category, age_restriction, dress_code, duration_minutes, poster_image_url, seat_arrangement_image_url, total_tickets, sold_tickets, is_featured, status, created_at, updated_at, contract_event_id) FROM stdin;
1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	张学友 Jacky Cheung《60+巡回演唱会》吉隆坡站	4ever	95d1b5ff-1fec-4563-9c1b-711dabb69ace	9c6d5310-b848-42d8-8631-deac5c615f8e	7a5ce061-9a59-4571-999f-9308fb184f4f	2025-08-15	16:30:00	13:21:00	Concert	all_ages	\N	120	data:image/webp;base64,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	\N	350	0	f	active	2025-08-15 08:21:57.931904+00	2025-08-15 08:22:18.47708+00	5
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.orders (id, buyer_id, event_id, seat_category_id, quantity, unit_price, total_price, transaction_hash, status, purchase_date, created_at) FROM stdin;
5efcda11-292c-49c6-b655-5fd123e33cc2	d10cca12-1950-4047-afa1-c2748f714638	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	1bfa39ef-a898-40ae-9e0a-db1e1501e8ed	3	0.004500	0.013500	0xe559e50878cec3c1eb8de85c25acf5d55c5c267bada776cf59a019a7c5fc44fb	confirmed	2025-08-15 08:24:27.471199+00	2025-08-15 08:24:27.471199+00
\.


--
-- Data for Name: resale_listings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.resale_listings (id, ticket_id, seller_id, original_price, resale_price, status, expires_at, created_at, sold_at) FROM stdin;
f3cf4794-5ddf-4e02-928e-517ea1d6817c	6d448511-aaee-4ffb-82eb-0e39449f3e0b	d10cca12-1950-4047-afa1-c2748f714638	0.0045	0.001	sold	\N	2025-08-15 09:16:34.238818+00	\N
7142f453-c878-4efa-8972-f7c962ec5377	6d448511-aaee-4ffb-82eb-0e39449f3e0b	8c605324-ca69-459f-8685-dadf724e7df5	0.0045	0.001	sold	\N	2025-08-15 09:20:57.453209+00	\N
2157f0bf-e6e0-4797-b2fb-24e8c74c6be1	6d448511-aaee-4ffb-82eb-0e39449f3e0b	28e0f27d-2868-4f51-8f31-f84f359a3e1e	0.0045	0.005	sold	\N	2025-08-15 09:56:06.98056+00	\N
\.


--
-- Data for Name: resale_settings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.resale_settings (id, event_id, seller_id, resale_enabled, max_resale_price_multiplier, royalty_percentage, transfer_restrictions, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: seat_assignments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.seat_assignments (id, event_id, seat_category_id, row_number, seat_number, is_available, reserved_until, reserved_by, ticket_id, created_at, updated_at) FROM stdin;
6c78b315-3004-431f-9dbe-5e80953f303f	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	1bfa39ef-a898-40ae-9e0a-db1e1501e8ed	1	4	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
9f25056b-98bf-4c84-9bf2-caaf600c4485	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	1bfa39ef-a898-40ae-9e0a-db1e1501e8ed	1	5	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
c3b6e313-07f5-4587-9ab8-823bd5c3e055	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	1bfa39ef-a898-40ae-9e0a-db1e1501e8ed	1	6	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
18e0f19a-bcf4-4479-aa71-8bc51a002f24	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	1bfa39ef-a898-40ae-9e0a-db1e1501e8ed	1	7	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
97a970a1-4036-4907-a082-dd3bfe2ac5db	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	1bfa39ef-a898-40ae-9e0a-db1e1501e8ed	1	8	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
99e8965e-ae99-4cf1-a40c-97e81dae3432	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	1bfa39ef-a898-40ae-9e0a-db1e1501e8ed	1	9	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
2bb16caa-f584-4751-b7bc-f7493f7546fa	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	1bfa39ef-a898-40ae-9e0a-db1e1501e8ed	1	10	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
22c9994a-f1eb-4bff-be5e-5eb4ef2f620c	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	1bfa39ef-a898-40ae-9e0a-db1e1501e8ed	2	1	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
f59fa78c-c119-482e-be50-19129fa6c045	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	1bfa39ef-a898-40ae-9e0a-db1e1501e8ed	2	2	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
0db205fc-69a9-4bf4-b4be-7662bbce6edb	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	1bfa39ef-a898-40ae-9e0a-db1e1501e8ed	2	3	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
17919400-eebe-416a-b2e7-2c0bfcf5e599	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	1bfa39ef-a898-40ae-9e0a-db1e1501e8ed	2	4	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
0dcf894e-e9bc-493d-b96a-c6336932d190	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	1bfa39ef-a898-40ae-9e0a-db1e1501e8ed	2	5	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
37dc3bae-dc64-479c-b865-8e2740464f15	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	1bfa39ef-a898-40ae-9e0a-db1e1501e8ed	2	6	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
85f2b52c-47bf-4a1f-a734-5bba31f4dd56	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	1bfa39ef-a898-40ae-9e0a-db1e1501e8ed	2	7	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
66e81a68-d39d-442c-a351-f566d4cc2d2a	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	1bfa39ef-a898-40ae-9e0a-db1e1501e8ed	2	8	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
c0d1c76d-ae35-480a-abbc-da7efe7c1fb3	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	1bfa39ef-a898-40ae-9e0a-db1e1501e8ed	2	9	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
5af0d1d1-d96d-467b-81d6-cd4ea1f30eb7	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	1bfa39ef-a898-40ae-9e0a-db1e1501e8ed	2	10	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
a75b347e-3af9-4560-825e-17c05dbdcc25	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	1bfa39ef-a898-40ae-9e0a-db1e1501e8ed	3	1	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
3bed1262-0651-40cb-a0d8-33811b8203c5	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	1bfa39ef-a898-40ae-9e0a-db1e1501e8ed	3	2	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
cc857425-342f-434e-8a8b-083b83b59913	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	1bfa39ef-a898-40ae-9e0a-db1e1501e8ed	3	3	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
fe254c03-b8b7-4ca3-910c-b81f8081fcd4	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	1bfa39ef-a898-40ae-9e0a-db1e1501e8ed	3	4	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
42769470-3599-49d4-a7e2-50796f3f432e	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	1bfa39ef-a898-40ae-9e0a-db1e1501e8ed	3	5	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
fb89f0d5-1ee5-49b3-88f7-6ed303f29545	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	1bfa39ef-a898-40ae-9e0a-db1e1501e8ed	3	6	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
5847bd0a-12d5-4ff4-b3b6-014bd3115e8d	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	1bfa39ef-a898-40ae-9e0a-db1e1501e8ed	3	7	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
e298beb5-36f7-4c15-b4d5-3ac7b04ad561	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	1bfa39ef-a898-40ae-9e0a-db1e1501e8ed	3	8	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
9334b775-81bf-4afd-91b7-6b81c7038342	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	1bfa39ef-a898-40ae-9e0a-db1e1501e8ed	3	9	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
cd112a42-b5ef-4de0-913a-88758c7897bd	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	1bfa39ef-a898-40ae-9e0a-db1e1501e8ed	3	10	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
bcdff1d9-bd52-497a-abcc-456be894eed2	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	1bfa39ef-a898-40ae-9e0a-db1e1501e8ed	4	1	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
28862455-5b4d-44d7-8ee3-d586e7ed5660	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	1bfa39ef-a898-40ae-9e0a-db1e1501e8ed	4	2	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
a357f8d6-2ca0-46d4-8716-44266c2e1cba	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	1bfa39ef-a898-40ae-9e0a-db1e1501e8ed	4	3	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
22b64ae9-28a0-4331-ac42-2ead9045baa9	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	1bfa39ef-a898-40ae-9e0a-db1e1501e8ed	4	4	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
21407012-944d-4230-8a85-d0af4e17885e	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	1bfa39ef-a898-40ae-9e0a-db1e1501e8ed	4	5	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
0a09905f-74c8-4f1b-82cf-074756e9d690	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	1bfa39ef-a898-40ae-9e0a-db1e1501e8ed	4	6	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
51880463-0593-48fc-984e-915b560269fb	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	1bfa39ef-a898-40ae-9e0a-db1e1501e8ed	4	7	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
1bede133-7302-4cb6-abab-5e96199f10cb	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	1bfa39ef-a898-40ae-9e0a-db1e1501e8ed	4	8	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
07fdb476-11ea-4822-ae12-1d6b6245a33b	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	1bfa39ef-a898-40ae-9e0a-db1e1501e8ed	4	9	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
4f34ed13-08be-40d1-83e5-4e63ae0634cf	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	1bfa39ef-a898-40ae-9e0a-db1e1501e8ed	4	10	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
fe1153d1-135e-4934-b070-eede0be0ae44	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	1bfa39ef-a898-40ae-9e0a-db1e1501e8ed	5	1	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
0b42ead1-75a4-411e-9702-a6eea5cab74a	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	1bfa39ef-a898-40ae-9e0a-db1e1501e8ed	5	2	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
a8fc1421-aa52-45f0-b623-ac90b0ed5e38	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	1bfa39ef-a898-40ae-9e0a-db1e1501e8ed	5	3	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
7f23440e-6b7e-46cf-93a6-6742428700a2	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	1bfa39ef-a898-40ae-9e0a-db1e1501e8ed	5	4	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
6f1d7c82-29a9-40ed-93ff-d7f7969a4e7a	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	1bfa39ef-a898-40ae-9e0a-db1e1501e8ed	5	5	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
c4ca139c-0659-4ff7-8cd2-e2c22843cb88	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	1bfa39ef-a898-40ae-9e0a-db1e1501e8ed	5	6	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
3e748e6c-cfb1-4092-a15f-43cca781777c	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	1bfa39ef-a898-40ae-9e0a-db1e1501e8ed	5	7	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
97700d5b-a419-4d86-8acf-8c82db33e96e	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	1bfa39ef-a898-40ae-9e0a-db1e1501e8ed	5	8	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
582a4f76-687f-4772-90e4-6c4955b49a02	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	1bfa39ef-a898-40ae-9e0a-db1e1501e8ed	5	9	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
954e556c-2da1-4fc7-a87a-fec958065511	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	1bfa39ef-a898-40ae-9e0a-db1e1501e8ed	5	10	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
0532d695-ef82-4240-821c-d49d3e5c4612	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	9ffd1be7-d376-4e44-8a38-26a06c2b4935	1	8	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
09396831-c952-45be-8fd0-caa7c034479f	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	9ffd1be7-d376-4e44-8a38-26a06c2b4935	1	9	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
43cecebc-ed92-4309-b73b-615e3ea399fb	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	9ffd1be7-d376-4e44-8a38-26a06c2b4935	1	10	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
aeb93e64-4b79-4452-8415-cd6a4c2dad81	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	9ffd1be7-d376-4e44-8a38-26a06c2b4935	2	1	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
9f0c54b2-b577-4828-8328-f88fd5efb34a	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	9ffd1be7-d376-4e44-8a38-26a06c2b4935	2	2	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
3c8f7850-0642-4120-8bbb-c2d8e144f46b	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	9ffd1be7-d376-4e44-8a38-26a06c2b4935	2	3	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
e3b498b0-5f1a-4fed-a169-8f8df3e8a091	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	9ffd1be7-d376-4e44-8a38-26a06c2b4935	2	4	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
335c9f7c-5f22-45b9-beca-526a2b3fddc6	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	9ffd1be7-d376-4e44-8a38-26a06c2b4935	2	5	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
c337c947-138f-4d68-943e-32ae5de48c97	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	9ffd1be7-d376-4e44-8a38-26a06c2b4935	2	6	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
2443ce2b-a86c-4156-be33-f14716abfc9c	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	9ffd1be7-d376-4e44-8a38-26a06c2b4935	2	7	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
81a345c9-e9d5-434e-9668-83f207f0a7e3	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	9ffd1be7-d376-4e44-8a38-26a06c2b4935	2	8	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
18fa5100-9994-4fd5-8f81-9086401d13c2	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	9ffd1be7-d376-4e44-8a38-26a06c2b4935	2	9	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
47e889a5-bba9-4d55-a813-96276e01706c	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	9ffd1be7-d376-4e44-8a38-26a06c2b4935	2	10	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
7a7c353d-a081-4992-bebb-1bff1a50e096	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	1bfa39ef-a898-40ae-9e0a-db1e1501e8ed	1	2	f	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
229114c6-ca3e-4cf0-a467-25d1de255a10	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	9ffd1be7-d376-4e44-8a38-26a06c2b4935	1	3	t	2025-08-15 08:48:39.332983+00	5214faac-b264-47df-b7b8-f95b77d765d9	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
adc5c5bc-1cce-4636-ad01-29546625aa8b	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	9ffd1be7-d376-4e44-8a38-26a06c2b4935	1	4	t	2025-08-15 08:50:24.108493+00	5214faac-b264-47df-b7b8-f95b77d765d9	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
4119607c-7abf-49e4-9a46-12b87f683ca9	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	9ffd1be7-d376-4e44-8a38-26a06c2b4935	1	5	t	2025-08-15 08:50:31.445775+00	5214faac-b264-47df-b7b8-f95b77d765d9	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
5789a7d5-a2d6-495c-82a4-e5635b60e178	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	9ffd1be7-d376-4e44-8a38-26a06c2b4935	1	6	t	2025-08-15 08:50:40.015065+00	5214faac-b264-47df-b7b8-f95b77d765d9	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
2576d4fa-6be9-4348-afa1-ecbd06557d1f	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	9ffd1be7-d376-4e44-8a38-26a06c2b4935	1	7	t	2025-08-15 08:51:17.294789+00	5214faac-b264-47df-b7b8-f95b77d765d9	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
f3bd6a7e-d074-4be1-9540-0d334d912402	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	9ffd1be7-d376-4e44-8a38-26a06c2b4935	3	1	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
f85e8985-ac3e-438e-a8e5-8feef9c9443a	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	9ffd1be7-d376-4e44-8a38-26a06c2b4935	3	2	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
bf1637dd-06d2-4c2c-a7fb-249edee0cffc	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	9ffd1be7-d376-4e44-8a38-26a06c2b4935	3	3	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
44303fb8-88c5-45b2-883e-8e5e4211d8f5	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	9ffd1be7-d376-4e44-8a38-26a06c2b4935	3	4	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
4427d738-fc94-43fe-aead-7da6493efac5	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	9ffd1be7-d376-4e44-8a38-26a06c2b4935	3	5	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
32160c48-8bbd-4b83-8e21-d5814dd43aa7	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	9ffd1be7-d376-4e44-8a38-26a06c2b4935	3	6	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
69c7402c-f22e-44c2-96b5-a838c6f071eb	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	9ffd1be7-d376-4e44-8a38-26a06c2b4935	3	7	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
9db9a0c1-f8b5-4d26-b3c9-30a88b56a216	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	9ffd1be7-d376-4e44-8a38-26a06c2b4935	3	8	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
55985924-3093-4ab4-9388-712c5dd9f396	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	9ffd1be7-d376-4e44-8a38-26a06c2b4935	3	9	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
19760075-b3a5-4e56-9e97-8389693d0acc	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	9ffd1be7-d376-4e44-8a38-26a06c2b4935	3	10	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
e64bd87a-9827-41bb-b565-f1e8f8529e02	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	9ffd1be7-d376-4e44-8a38-26a06c2b4935	4	1	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
4e96b521-3a1f-4407-82f0-d054ce7203ee	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	9ffd1be7-d376-4e44-8a38-26a06c2b4935	4	2	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
d6e3260e-b8dd-483c-a6b9-d9e814286ae8	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	9ffd1be7-d376-4e44-8a38-26a06c2b4935	4	3	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
fa4d76ca-9ded-432e-b687-8ab83819c6f4	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	9ffd1be7-d376-4e44-8a38-26a06c2b4935	4	4	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
3deb72e1-b3fd-4336-8eca-7c89ad402ab9	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	9ffd1be7-d376-4e44-8a38-26a06c2b4935	4	5	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
db44ae34-9721-487a-9a3b-1475118e08c6	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	9ffd1be7-d376-4e44-8a38-26a06c2b4935	4	6	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
de3edbfe-1f7a-475d-b4bb-8b9a5e4e786f	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	9ffd1be7-d376-4e44-8a38-26a06c2b4935	4	7	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
f4bef390-ea1b-42e1-86d7-3f7df463a158	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	9ffd1be7-d376-4e44-8a38-26a06c2b4935	4	8	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
567b8f45-8e79-4e09-8693-c4e63762e7cb	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	9ffd1be7-d376-4e44-8a38-26a06c2b4935	4	9	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
272c49cd-b856-438e-8b11-750b6e921c9b	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	9ffd1be7-d376-4e44-8a38-26a06c2b4935	4	10	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
4e3d4824-4974-4b43-97c5-fd8f7a0dce35	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	9ffd1be7-d376-4e44-8a38-26a06c2b4935	5	1	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
723e0c42-6a89-4ea8-a3fc-6649866aa71f	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	9ffd1be7-d376-4e44-8a38-26a06c2b4935	5	2	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
d1e23fd3-5ee9-4789-8e25-ba407f8fe9b0	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	9ffd1be7-d376-4e44-8a38-26a06c2b4935	5	3	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
7a1fe099-5a80-4ca5-bffc-b34f34da0c81	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	9ffd1be7-d376-4e44-8a38-26a06c2b4935	5	4	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
d906b68e-bb6b-49cc-aec0-114c2f69ce4a	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	9ffd1be7-d376-4e44-8a38-26a06c2b4935	5	5	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
7468205d-3128-41ad-a515-efecaf88683c	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	9ffd1be7-d376-4e44-8a38-26a06c2b4935	5	6	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
0f7bc7a2-8395-4746-9edc-93abcc310a69	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	9ffd1be7-d376-4e44-8a38-26a06c2b4935	5	7	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
489d8814-2247-4d8f-9ffa-eb82188d8027	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	9ffd1be7-d376-4e44-8a38-26a06c2b4935	5	8	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
e2f67207-7f58-486e-89c5-02661f25266e	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	9ffd1be7-d376-4e44-8a38-26a06c2b4935	5	9	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
c3284a3b-7d6b-4942-a3ba-e9e24817a326	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	9ffd1be7-d376-4e44-8a38-26a06c2b4935	5	10	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
88e09926-3337-465c-bd99-b786695f0855	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	9ffd1be7-d376-4e44-8a38-26a06c2b4935	6	1	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
252ea1de-ddac-41a0-ba30-c77003bf8be3	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	9ffd1be7-d376-4e44-8a38-26a06c2b4935	6	2	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
9ef91ec8-16e7-413f-98b4-097189d432ef	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	9ffd1be7-d376-4e44-8a38-26a06c2b4935	6	3	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
a7673308-5809-41de-9b6b-254cf90eb2ee	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	9ffd1be7-d376-4e44-8a38-26a06c2b4935	6	4	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
390cd55b-b1ae-453d-a20c-4ea528a13178	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	9ffd1be7-d376-4e44-8a38-26a06c2b4935	6	5	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
7e18cbb3-5ed6-4e34-8eee-ce1026b0b2d7	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	9ffd1be7-d376-4e44-8a38-26a06c2b4935	6	6	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
74604340-60c6-4bfc-8a44-4b88c4af744e	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	9ffd1be7-d376-4e44-8a38-26a06c2b4935	6	7	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
e837e0ae-c0f8-483b-b1a9-a3e73f8f0e51	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	9ffd1be7-d376-4e44-8a38-26a06c2b4935	6	8	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
b31f4221-296a-45da-936c-4ad2c10ea9fe	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	9ffd1be7-d376-4e44-8a38-26a06c2b4935	6	9	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
bb0e086d-97e3-4006-8952-58d268f6de98	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	9ffd1be7-d376-4e44-8a38-26a06c2b4935	6	10	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
f669397a-67d9-48b7-b9db-fb07441beff7	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	9ffd1be7-d376-4e44-8a38-26a06c2b4935	7	1	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
ec8592c9-e2f5-4c55-a85d-a656f2927880	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	9ffd1be7-d376-4e44-8a38-26a06c2b4935	7	2	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
b827828d-f85f-4618-8fd1-1d50f02542cd	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	9ffd1be7-d376-4e44-8a38-26a06c2b4935	7	3	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
b1ec6335-7818-41c0-b886-697f629c29ea	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	9ffd1be7-d376-4e44-8a38-26a06c2b4935	7	4	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
a089bb3a-bdd3-4f05-9eb0-560dd0b180f1	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	9ffd1be7-d376-4e44-8a38-26a06c2b4935	7	5	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
e3947d18-13fb-4df6-812d-bb94640661ca	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	9ffd1be7-d376-4e44-8a38-26a06c2b4935	7	6	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
7303f9b4-9566-4cd8-b6c3-fcd663832489	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	9ffd1be7-d376-4e44-8a38-26a06c2b4935	7	7	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
0072d178-f36d-44d7-9393-9daf32c11f92	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	9ffd1be7-d376-4e44-8a38-26a06c2b4935	7	8	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
16abceaa-e97d-4c5d-8a06-cea494304ff9	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	9ffd1be7-d376-4e44-8a38-26a06c2b4935	7	9	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
9365f11f-f5ef-482e-9bfa-ccf2faa029af	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	9ffd1be7-d376-4e44-8a38-26a06c2b4935	7	10	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
b903a9fe-3e8d-4d1c-9595-4ac321efbe1a	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	9ffd1be7-d376-4e44-8a38-26a06c2b4935	8	1	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
67a65827-ec61-46dd-babf-6a650352a9a2	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	9ffd1be7-d376-4e44-8a38-26a06c2b4935	8	2	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
b57b4bbe-9472-4389-9585-d08348b52f72	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	9ffd1be7-d376-4e44-8a38-26a06c2b4935	8	3	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
8f193dd1-ef3d-4ad0-9095-e5e6ac9cb930	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	9ffd1be7-d376-4e44-8a38-26a06c2b4935	8	4	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
6f49bd4f-f29d-4d3b-9d2f-f7c59495cf48	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	9ffd1be7-d376-4e44-8a38-26a06c2b4935	8	5	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
ea0d5de9-a107-4fdd-b4c6-72ef95cec6e5	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	9ffd1be7-d376-4e44-8a38-26a06c2b4935	8	6	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
53d77713-53c2-4df0-9b17-044abd4c66c0	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	9ffd1be7-d376-4e44-8a38-26a06c2b4935	8	7	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
5c2dd69b-a401-4a04-9148-908c3fd8eb3f	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	9ffd1be7-d376-4e44-8a38-26a06c2b4935	8	8	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
8528b795-dd01-40c8-8e16-653934221b80	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	9ffd1be7-d376-4e44-8a38-26a06c2b4935	8	9	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
b52439d3-8583-4437-ae1c-af6175c16e8d	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	9ffd1be7-d376-4e44-8a38-26a06c2b4935	8	10	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
fe1dc008-bbe9-48a4-8d0e-97b409ca0b59	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	9ffd1be7-d376-4e44-8a38-26a06c2b4935	9	1	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
a741887a-2c3c-460b-8ba5-05e9f2cd871e	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	9ffd1be7-d376-4e44-8a38-26a06c2b4935	9	2	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
bb27f5c4-e910-46ed-9269-67ccc0316850	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	9ffd1be7-d376-4e44-8a38-26a06c2b4935	9	3	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
051cdb06-1ae6-4af8-8544-4720d31f3a05	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	9ffd1be7-d376-4e44-8a38-26a06c2b4935	9	4	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
58db6888-ae07-4d54-aa92-d65079a840ef	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	9ffd1be7-d376-4e44-8a38-26a06c2b4935	9	5	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
bb497076-1eb9-4e6d-be7f-4336a5709961	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	9ffd1be7-d376-4e44-8a38-26a06c2b4935	9	6	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
2f56eb2c-dad7-4858-86fb-e4a2ce6c047e	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	9ffd1be7-d376-4e44-8a38-26a06c2b4935	9	7	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
c9b99b9c-0d55-4b5c-b7fc-534b6a3977d4	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	9ffd1be7-d376-4e44-8a38-26a06c2b4935	9	8	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
dd6dea66-eb4d-4d6d-913c-6e59db741f6d	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	9ffd1be7-d376-4e44-8a38-26a06c2b4935	9	9	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
0c03bbd8-e29f-4d25-a6c9-ab8cad1bebae	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	9ffd1be7-d376-4e44-8a38-26a06c2b4935	9	10	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
baa2fb43-717d-4e25-a497-f2cd2e4af121	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	9ffd1be7-d376-4e44-8a38-26a06c2b4935	10	1	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
808f8f0f-2fde-420b-8d00-23a1b2580a92	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	9ffd1be7-d376-4e44-8a38-26a06c2b4935	10	2	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
76e9d0dc-2613-4c1e-9c1f-4cbfac69de05	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	9ffd1be7-d376-4e44-8a38-26a06c2b4935	10	3	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
c910c7f9-7789-456e-bdd1-affa88f7e5ab	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	9ffd1be7-d376-4e44-8a38-26a06c2b4935	10	4	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
6761efb6-6f57-4eea-9d88-6e76db94e5a2	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	9ffd1be7-d376-4e44-8a38-26a06c2b4935	10	5	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
f1813144-e5fb-42b3-a937-a7ebca245b30	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	9ffd1be7-d376-4e44-8a38-26a06c2b4935	10	6	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
02109ae7-f234-4f48-9031-5c3b26d6b558	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	9ffd1be7-d376-4e44-8a38-26a06c2b4935	10	7	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
c1fb025f-493f-4118-ac5d-7400a74624c3	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	9ffd1be7-d376-4e44-8a38-26a06c2b4935	10	8	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
34b03d3d-09e2-481b-852e-58687877cb4f	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	9ffd1be7-d376-4e44-8a38-26a06c2b4935	10	9	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
4a108c26-05ba-4ece-af7f-c0696ec41e57	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	9ffd1be7-d376-4e44-8a38-26a06c2b4935	10	10	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
1b9ac763-3015-49f3-a8b0-48e9b9ef33ff	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	1	9	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
e2819a11-fe07-4b4a-85c2-8a729b362ed5	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	1	10	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
2281212d-c7e7-4524-8bda-f46dc5aeb8d2	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	2	1	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
d79f86d2-2252-4675-90cd-c463c6b552d5	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	2	2	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
ff319f58-eda8-4a58-8379-165ac5c04fbd	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	2	3	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
9e5c5e1b-9353-42fc-8453-7b683798f66f	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	2	4	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
c89b9a49-d837-4ba9-a536-2ea37e018e8c	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	2	5	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
13adde9e-a955-4785-8d25-f55957ac7d85	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	2	6	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
513d4e23-5fcb-4582-b434-cb87b52f82c7	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	2	7	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
7279bc41-b4a8-4edf-9e3a-5a8b9f947b27	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	2	8	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
c35dad7f-7489-401c-baae-34ba319b67ee	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	2	9	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
6c7e7faa-ef82-4be5-b1e0-ac4ce78b6908	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	2	10	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
f4c2dbcd-63f9-4e7e-aa68-9c596561cd35	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	3	1	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
cc5f070a-7967-4865-9b7e-424e6cf69f4e	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	3	2	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
8f42566f-c9fb-4a1d-bb2d-093577a5917e	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	3	3	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
1d7c5db7-069b-4804-b485-ba10a5525a28	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	3	4	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
10050f7e-d864-4e56-9eeb-b28b4f86ee37	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	3	5	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
d0bc8d92-bd64-4ab0-b93c-98d0b2669793	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	3	6	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
6711721c-6e65-4edf-999f-4b34c9563318	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	3	7	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
f40d76ce-1208-48e3-8539-d50dd89b2e36	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	3	8	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
7590e3be-ef23-4b8c-bef3-026292fd3072	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	3	9	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
6b4f2d9b-8bde-40ed-ad65-3a54f314c78c	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	3	10	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
0098c937-e811-49a0-b3b9-97c9b8a89f4f	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	4	1	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
ed27fbdd-7a86-4ab6-ac08-7f34e2c3c777	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	4	2	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
5f9bddf6-fbfa-4312-8b1a-3538c9dc3b24	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	4	3	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
6c146b6d-db71-486a-b0eb-e5c6373349ae	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	4	4	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
6f682509-075b-4f8f-babb-8107ea7c80f3	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	4	5	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
7be93eec-fe64-4151-b729-ace5d150d1a6	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	4	6	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
72d30fd8-3ab6-44ba-9e51-8a7312e3fc70	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	4	7	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
4cb3a80e-b879-4422-aa55-707cd135efbe	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	4	8	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
561ecb0e-c7e5-4d48-9ad1-6a8512eb4154	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	4	9	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
ae790b80-84ca-45d4-9105-f9563df19969	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	4	10	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
17c60959-cbe4-4299-9b70-c7e78733e934	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	5	1	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
a08306a4-3cde-4dfa-a73c-1cb256460ede	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	5	2	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
508577ab-7370-4597-8ee2-30766e684015	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	5	3	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
c5fa961f-eb20-443a-aba4-46a82531882b	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	5	4	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
25ffe388-66f9-4136-b797-cf0bcb04a1ba	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	5	5	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
23cab34c-42e8-4ab1-a3a8-bfc4d13913fe	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	5	6	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
a5eb88f1-d7c1-428f-a8fb-eea582116b5a	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	5	7	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
8d494571-bd89-4b72-9816-38a41eb80abc	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	5	8	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
b5c5e593-4d82-4013-848a-13bd14676799	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	5	9	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
b037946f-4669-4fac-accd-fb3e019e147f	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	5	10	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
b62f40f9-a434-4a27-9eb9-fc76b62a8803	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	6	1	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
ef15cc6b-563f-4853-9f76-1917d5c9e8e2	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	6	2	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
500245fc-9db2-4f05-9217-8c51437faf2e	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	6	3	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
878264af-026a-4afa-8bbb-00365bf5bd8e	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	6	4	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
52004138-4b95-493f-94d8-8a27f6fea378	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	6	5	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
4b8ddac1-008f-4bae-a52b-be0252dc30b8	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	6	6	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
9e6258ac-c21e-4cd8-9cc4-6c0ba9aeacf7	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	6	7	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
d945c596-9221-4ddf-aab0-734f718d293c	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	6	8	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
5df5c8fc-604d-4f3f-a60e-ab1765d9b1d7	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	6	9	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
875f91f7-6a29-440f-8fc6-6f4591685974	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	6	10	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
473cd798-ae6c-4cdd-8eda-39aa8e1d4a43	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	1	2	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
3ced3abf-ddad-45f1-ae21-49af8233b8d2	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	1	4	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
30086d70-0105-4bc3-beb1-651ca874c726	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	1	6	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
6cf64c15-0fe3-46c5-a9ea-ef70069cded0	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	7	1	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
8c1ce28c-c5a6-46f6-96a5-4642297bfb0a	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	7	2	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
8660d390-b4e3-4f06-9850-eca1069715cb	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	7	3	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
7e9cdac5-9dee-44e8-ae21-74c8d395c972	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	7	4	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
50ef3062-8624-49e8-9b1f-f48794d9f44e	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	7	5	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
5d525e45-5b3c-448d-bfa6-e82244def97c	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	7	6	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
acff16fe-2cec-4f49-bd80-2e1f0f0052d7	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	7	7	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
6fa9c12b-abf5-47b9-819f-02a136be014f	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	7	8	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
1b48ef20-4343-4e23-aa46-f94106aafe90	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	7	9	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
59f5662f-d1f2-4ed5-842b-b869427cf85a	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	7	10	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
f427186a-cc7a-4ae4-8d90-a12f4e9103f0	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	8	1	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
887f2df2-5539-43b2-ad8d-57b82ee7aca2	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	8	2	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
ba1897fa-6a9c-4543-b75d-1dc01da92431	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	8	3	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
5f5fe975-4760-4f7f-9673-c585e384fd48	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	8	4	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
39381277-27ff-430d-8955-5dd6cd4d964e	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	8	5	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
1b2fe67a-df49-4802-baac-0ad3e4e437e6	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	8	6	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
7bac0fea-8783-4abc-8521-ff3f6dd38e11	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	8	7	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
38d6246b-0585-4e19-bdd5-4586da95ab45	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	8	8	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
f3bb21b7-adf4-41eb-9858-4f38c3859778	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	8	9	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
ef525b9f-3be9-4599-988e-870cc6fe8d91	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	8	10	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
f829c89e-650d-4c6c-a4e6-eb0d156873c0	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	9	1	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
5e329e6d-c678-4b10-b5f7-c8925618ee1e	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	9	2	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
d1f41b1f-099d-4a68-b553-71af8eb80057	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	9	3	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
5fc20d6c-153a-446f-91b3-b0570ed8e8c1	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	9	4	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
acfa7b14-d1d3-4c1c-8613-e7e9f105d2e8	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	9	5	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
b30d50be-4801-481e-b1d3-8c0f536cafb0	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	9	6	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
d3b67e46-c8cd-4c84-a77f-b1802ae0a78b	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	9	7	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
39cbbae4-abde-4eaa-95db-7a171654afa6	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	9	8	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
64d3680c-8faf-4b59-a099-65065fd9d3ba	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	9	9	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
1455c006-5280-4391-a503-c37351fcb90c	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	9	10	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
e78f147b-15ec-47da-96a0-55ccbdbb9d84	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	10	1	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
add7da72-ad57-403d-9f45-4567a7be814b	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	10	2	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
df845400-d9e5-4c06-84bd-a924b7bca19a	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	10	3	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
e3481e8b-f413-4009-a024-ee7f5d117042	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	10	4	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
a45a05ae-10e2-41b5-a747-06b4d4db1639	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	10	5	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
da8f1764-ee26-427b-beb4-4f6ef5a7d228	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	10	6	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
c3f1694c-bcac-4101-bce9-d783562c0015	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	10	7	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
6ca76c1e-100c-4c1e-a311-c0938f9f7ced	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	10	8	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
cb2e04e2-9e77-47aa-bd73-5788fd40b388	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	10	9	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
84b309c0-94f9-4958-bc21-4700ace1853e	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	10	10	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
7abded60-af1a-49e3-b24d-d1a8b5c1d0b0	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	11	1	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
af0e5fad-c67b-4469-a3c4-203dbb2c02dd	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	11	2	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
4fd7e2bb-e88c-4d3f-9697-d379dc412108	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	11	3	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
5ffdf938-14be-42a1-b017-c748159d682b	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	11	4	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
2c60d605-cec3-42ff-816e-08073a22e751	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	11	5	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
c347da26-9421-4686-8f5f-e4671ea0b572	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	11	6	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
7f584c33-482f-4817-8d62-5262bcdf3cad	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	11	7	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
2fed8421-4356-4ed9-a721-f5a817bfdd4d	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	11	8	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
eb08523b-075f-4822-be78-2884a2672261	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	11	9	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
3c1a9921-fcb7-450f-b4a7-ad1441af689f	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	11	10	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
8fc12d55-3a6d-45ca-8915-c56e888466f7	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	12	1	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
e9511d1d-7b1b-44c2-abe1-f017caa1d8f3	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	12	2	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
a7bd0b24-3de9-4638-8947-29710e207b5d	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	12	3	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
78165ab0-48a4-4d97-b9f0-47061603d4e9	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	12	4	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
7c9ce333-3d9d-41ff-aa90-f859d094cd3c	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	12	5	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
1e19a84d-541f-43c6-a536-bb6396dd2c1b	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	12	6	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
a7512b7b-7d6f-4288-8ff8-b78b2bcc654f	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	12	7	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
53fdd2f6-b9a3-4ae9-b1fd-fb6ac2a8ec29	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	12	8	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
be069808-6955-4cb6-9d05-b9c4f888a43f	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	12	9	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
d2778f52-ef53-40f0-97e5-94ca4257d946	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	12	10	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
316411a3-22b7-486c-98d7-35ab53c935f0	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	13	1	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
aee9c116-8459-4d0e-b64b-50b7d6c670a6	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	13	2	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
c81c6cf0-c21c-4cf0-9172-d8e178273bd6	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	13	3	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
c2209054-61db-4f93-ba67-12eae2bfb123	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	13	4	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
fc5df9da-54cc-4a1b-9a21-6a821e378959	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	13	5	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
05f8e97c-dd9c-4f12-ae06-983869d8473d	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	13	6	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
f232b014-74fd-4132-9e29-bffef5840f39	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	13	7	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
7941340e-987b-4bf1-bbfb-2fb5b64e4c70	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	13	8	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
47393f32-1947-4200-8681-d696bcca6793	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	13	9	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
511c37e3-0b93-4c1e-aa7e-06e3e7775aae	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	13	10	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
c94baf12-066e-4c7d-b702-2767dd56fc7f	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	14	1	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
e56ddfe3-33ce-4ad1-a55c-65bcf700452e	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	14	2	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
4a93656f-dade-49f4-827a-48d4f621bf99	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	14	3	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
f16d1648-070c-44d4-8476-13ab650c125c	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	14	4	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
924754d7-7edc-43a0-95d6-ee0a3fe5dcfc	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	14	5	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
c122c02b-1d68-4a0d-bb40-7a9c54f4aeff	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	14	6	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
e0106003-4811-46f8-90dd-5e39c56c6ee5	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	14	7	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
d38a59c0-493d-4a81-9a42-3320cfd4fa06	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	14	8	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
bcf3659c-9b38-4ca8-afc1-29e5b20c390f	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	14	9	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
f4bd0b77-06aa-48ed-b79e-b7b58d8f2e16	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	14	10	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
30c21e72-b95a-401a-a2f0-a0059c3fdf25	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	15	1	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
13b9387d-51c9-4bb8-b48d-619bd82253c1	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	15	2	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
cbf4dd72-8572-46bd-b97f-91726b74a417	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	15	3	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
262adaca-7392-4e6b-9880-2d2a4f1c5ddc	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	15	4	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
d4465b15-4578-4807-8422-b808874996c9	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	15	5	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
08b57fb5-e7e6-4a16-aa70-b3ca4cd16757	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	15	6	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
ca60259e-fe76-45cf-936f-1789fe0350f6	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	15	7	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
8a7aa871-d9ac-4755-9bb0-7aa14787511e	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	15	8	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
d735d367-2af3-46a9-a8a3-dc8531ab1319	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	15	9	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
0a5eb07f-645f-495c-90d1-88449c3c8df1	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	15	10	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
6bd530c6-c091-4eab-97c1-73ee0bcd2920	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	16	1	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
9da332cd-0544-4f1f-9780-aa85fe446e32	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	16	2	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
b3a8b298-af30-4893-a789-fb01ad3e67cf	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	16	3	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
3454305c-df20-47b5-b91d-f6d63780f1c7	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	16	4	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
2b723c80-2239-45bc-9673-a00b8e90c6b5	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	16	5	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
c050eb6c-e9d7-4535-aa63-54b328a1fe9a	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	16	6	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
3a398972-6bbd-408a-96d3-428e665eedf2	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	16	7	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
cb5b4404-b855-48e2-b56b-29763b335a41	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	16	8	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
46868b2a-259c-4bb1-bd71-4158acf12ae1	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	16	9	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
e9978d77-78ff-4790-9bf1-b200c0273211	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	16	10	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
86d965ae-a3d9-44ba-b44d-6ffda0ab3cff	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	17	1	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
462bd29b-70b8-491d-aadd-32f8e97d9d9d	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	17	2	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
cc3d6fc8-05af-4443-aa65-9f30d1e2dde9	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	17	3	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
abbef787-3f7f-4053-a044-f388fedc9ea5	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	17	4	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
3177804e-d872-43fa-8f7a-069c1acaabea	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	17	5	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
07388fee-7d2c-471f-844b-fed481165ad9	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	17	6	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
fcf50291-4e65-40fe-b629-9d5de61d5a7a	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	17	7	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
f00d1575-90bd-49d0-a5b4-ab3125784f76	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	17	8	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
4bd1e963-15e5-4664-addf-70c6b43195d7	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	17	9	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
12f40cee-a54b-4c44-9af5-c8a1ecb2827f	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	17	10	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
e23214da-8932-4339-af7c-f804daf5dce3	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	18	1	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
fdfba72f-a0e4-48f1-a667-48f9069b35b2	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	18	2	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
680cd759-f396-47ea-8551-f481755488b9	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	18	3	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
df49133b-23c5-46aa-878c-a872cdeeb35a	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	18	4	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
8adc0342-6b23-4182-98ad-9547212af22d	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	18	5	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
f36a1d30-5a80-4357-8f22-844977177521	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	18	6	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
add7e298-311b-428e-a0d7-42ea4f158e0a	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	18	7	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
ecd2912d-0df7-4bc8-b8c6-772d088ed36f	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	18	8	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
f8329919-e316-499c-b1a7-4ade2a4b659f	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	18	9	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
264aa3af-1903-4903-995f-dea2013f95ee	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	18	10	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
98bd356f-d6a8-4bfb-9e24-4203d49b4321	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	19	1	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
0740d7c6-1417-4786-8fbe-8b022b2ded66	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	19	2	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
5a12fdfa-4fd1-4506-aeac-ee749df5921e	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	19	3	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
16aa347a-9374-43fe-b6ed-e1d3f0a8924c	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	19	4	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
f53be6d5-c9e0-4ae3-8267-59ed25230d39	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	19	5	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
565dcb6f-aa76-4b27-9b8a-85a645395ef5	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	19	6	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
da5fec26-d448-4211-9a45-9d625c946d2c	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	19	7	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
210a5e54-0dea-4338-a248-bc525fdfb142	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	19	8	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
77e97fd6-5d95-4790-9697-579e864e6d83	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	19	9	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
2ce9bde8-5c17-4363-a57d-f21f14ae3ef5	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	19	10	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
83662564-878b-42b0-9704-af5c77f1a438	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	20	1	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
ed7f6b55-70a5-4e82-b228-48c302b72018	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	20	2	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
92ce0812-e233-4af4-9a40-77463ff09ddd	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	20	3	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
8d3fe476-c4e3-4416-b5b5-44312b4ff8b2	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	20	4	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
ae066af9-7a2b-402c-823e-1652ffeda163	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	20	5	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
e28ce0c0-5be5-43b8-921b-96f3e6c2bac6	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	20	6	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
e2c4b4d7-a328-489c-8f69-a600e954331f	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	20	7	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
9fa36347-3129-4b71-80ea-e0475861e941	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	20	8	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
50180687-c166-4bf0-8afc-52113bd98e61	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	20	9	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
7aa6a1c2-a8f6-492d-b0c3-3eda2f195678	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	20	10	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
9f53a47e-39f8-4228-9df9-22aade6fee77	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	1bfa39ef-a898-40ae-9e0a-db1e1501e8ed	1	1	f	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
a43bfadb-2d14-498f-9a30-4a229d134b5e	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	9ffd1be7-d376-4e44-8a38-26a06c2b4935	1	1	f	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
f794ab52-2137-4870-8661-218a717692d9	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	1bfa39ef-a898-40ae-9e0a-db1e1501e8ed	1	3	f	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
e160a7f6-8e29-49fe-accd-67aeed9f88dd	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	9ffd1be7-d376-4e44-8a38-26a06c2b4935	1	2	f	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
4470531d-3a85-4396-b4d9-a8054bca73fe	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	1	1	f	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
a1020383-de3a-42a8-a53e-eb5951a7a217	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	1	3	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
e4be3708-1d48-48fb-976c-9b43abf75f01	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	1	5	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
cc33ff28-a829-475f-b98a-2d59553816b0	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	1	7	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
6b9a6496-312c-436c-9fb7-18f660aac5de	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	62d86863-6f53-42bd-a4f9-2c9580ac4c78	1	8	t	\N	\N	\N	2025-08-15 08:21:58.118443+00	2025-08-15 08:21:58.118443+00
\.


--
-- Data for Name: seat_categories; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.seat_categories (id, event_id, name, price, capacity, sold, color, nft_image_url, created_at, total_rows, seats_per_row, row_prefix) FROM stdin;
9ffd1be7-d376-4e44-8a38-26a06c2b4935	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	Premium	0.003500	100	0	#3b82f6	https://turquoise-acceptable-galliform-263.mypinata.cloud/ipfs/bafkreiaiikl6br3zkp2juehtyno5c42q25qe4inip3evigf4agkguajpa4	2025-08-15 08:21:58.118443+00	10	10	P
62d86863-6f53-42bd-a4f9-2c9580ac4c78	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	Standard	0.002500	200	0	#6b7280	https://turquoise-acceptable-galliform-263.mypinata.cloud/ipfs/bafkreifwkf3ziuwxngnyistvjvq5ujg6swhqs4ybjj2qy7kooyjyxjbdf4	2025-08-15 08:21:58.118443+00	20	10	S
1bfa39ef-a898-40ae-9e0a-db1e1501e8ed	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	VIP	0.004500	50	3	#fbbf24	https://turquoise-acceptable-galliform-263.mypinata.cloud/ipfs/bafkreigugo6cddjkfldzqjcfjucmlkpzz3fydljmcsoupfyrfdu3ntyrwe	2025-08-15 08:21:58.118443+00	5	10	V
\.


--
-- Data for Name: sellers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sellers (id, business_name, business_type, bio, location, contact_phone, tax_id, wallet_address, wallet_balance, wallet_verified, events_created, total_revenue, average_rating, verified_seller, commission_rate, notification_new_orders, notification_customer_messages, notification_payout_updates, notification_marketing_emails, created_at, updated_at) FROM stdin;
7a5ce061-9a59-4571-999f-9308fb184f4f	\N	\N	\N	\N	\N	\N	0x8c0c195feda7e3cd38cc2746bea5516351a626e6	2.10869419	t	0	0.00	0.00	f	5.00	t	t	t	f	2025-07-23 08:41:59.937457+00	2025-07-23 08:41:59.937457+00
51dd7a85-d9cd-4a55-b295-037c6a6d4d24	\N	\N	\N	\N	\N	\N	\N	0.00000000	f	0	0.00	0.00	f	5.00	t	t	t	f	2025-08-15 08:45:32.322222+00	2025-08-15 08:45:32.322222+00
\.


--
-- Data for Name: tickets; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.tickets (id, token_id, order_id, event_id, seat_category_id, owner_id, ticket_number, qr_code, seat_row, seat_number, is_used, used_at, created_at, transferred_at) FROM stdin;
9eb6b041-27dd-4d6b-bb97-405d15d1be66	1	5efcda11-292c-49c6-b655-5fd123e33cc2	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	1bfa39ef-a898-40ae-9e0a-db1e1501e8ed	8c605324-ca69-459f-8685-dadf724e7df5	TKT-5-1	QR-TKT-5-1	1	3	f	\N	2025-08-15 08:24:27.677494+00	\N
e2ca748d-62a3-411d-9de1-7949a9de8918	2	5efcda11-292c-49c6-b655-5fd123e33cc2	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	1bfa39ef-a898-40ae-9e0a-db1e1501e8ed	d10cca12-1950-4047-afa1-c2748f714638	TKT-5-2	QR-TKT-5-2	1	2	f	\N	2025-08-15 08:24:27.676357+00	\N
6d448511-aaee-4ffb-82eb-0e39449f3e0b	3	5efcda11-292c-49c6-b655-5fd123e33cc2	1cb8e50c-6985-44f7-983c-b2d7ba81eb9c	1bfa39ef-a898-40ae-9e0a-db1e1501e8ed	8c605324-ca69-459f-8685-dadf724e7df5	TKT-5-3	QR-TKT-5-3	1	1	f	\N	2025-08-15 08:24:27.67829+00	2025-08-15 10:00:24.472+00
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, email, display_name, avatar_url, user_type, created_at, updated_at) FROM stdin;
7a5ce061-9a59-4571-999f-9308fb184f4f	jackson030925@gmail.com	Jackson How	\N	seller	2025-07-23 08:41:59.937457+00	2025-07-23 08:41:59.937457+00
0af461ad-0380-4e8a-afd6-aba9f0dd01e1	haobintee@gmail.com	Tee Hao Bin	\N	buyer	2025-07-23 08:45:40.951969+00	2025-07-23 08:45:40.951969+00
d10cca12-1950-4047-afa1-c2748f714638	jackjon836@gmail.com	Jackson How	\N	buyer	2025-07-23 16:12:00.606016+00	2025-07-23 16:12:00.606016+00
8c605324-ca69-459f-8685-dadf724e7df5	tiandi264@gmail.com	Jackson How	\N	buyer	2025-08-15 04:35:21.356437+00	2025-08-15 04:35:21.356437+00
28e0f27d-2868-4f51-8f31-f84f359a3e1e	tp074435@mail.apu.edu.my	Hao Bin	\N	buyer	2025-08-15 07:50:01.017443+00	2025-08-15 07:50:01.017443+00
5214faac-b264-47df-b7b8-f95b77d765d9	leeeeern@gmail.com	Ee-Ern	\N	buyer	2025-08-15 08:00:31.51273+00	2025-08-15 08:00:31.51273+00
51dd7a85-d9cd-4a55-b295-037c6a6d4d24	tp067238@mail.apu.edu.my	Lee Ee-Ern	\N	seller	2025-08-15 08:45:32.322222+00	2025-08-15 08:45:32.322222+00
32653a94-b6d1-423c-a1d6-e455ca154c37	chinpeifung0224@gmail.com	Pei Fung	\N	buyer	2025-08-15 10:44:37.920282+00	2025-08-15 10:44:37.920282+00
\.


--
-- Data for Name: venues; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.venues (id, name, address, city, state, country, capacity, parking_available, accessibility_features, created_at) FROM stdin;
9c6d5310-b848-42d8-8631-deac5c615f8e	Bukit Jalil National Stadium	Bukit Jalil National Sports Complex	Kuala Lumpur	Wilayah Persekutuan	Malaysia	87411	t	{"Wheelchair Accessible",Elevators,"Accessible Restrooms"}	2025-06-25 06:19:15.241832+00
9b5805cd-3fca-4ead-b96f-5c3eef9ffad5	Shah Alam Stadium	Persiaran Sukan, Seksyen 13	Shah Alam	Selangor	Malaysia	80000	t	{"Wheelchair Accessible",Elevators}	2025-06-25 06:19:15.241832+00
da5a2e9a-d650-4ae9-a46f-777ee238a27f	Stadium Sultan Ibrahim	Iskandar Puteri	Johor Bahru	Johor	Malaysia	40000	t	{"Wheelchair Accessible","Accessible Restrooms"}	2025-06-25 06:19:15.241832+00
6e42198f-f4f2-473a-b464-5c52869e6c9c	Darul Makmur Stadium	Jalan Stadium	Kuantan	Pahang	Malaysia	40000	f	{"Wheelchair Accessible"}	2025-06-25 06:19:15.241832+00
385680ec-ddf2-4ea3-8219-b4bc98fe813b	Stadium Negeri	Petra Jaya	Kuching	Sarawak	Malaysia	25000	t	{"Wheelchair Accessible",Elevators}	2025-06-25 06:19:15.241832+00
\.


--
-- Name: artists artists_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.artists
    ADD CONSTRAINT artists_pkey PRIMARY KEY (id);


--
-- Name: buyers buyers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.buyers
    ADD CONSTRAINT buyers_pkey PRIMARY KEY (id);


--
-- Name: events events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: resale_listings resale_listings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resale_listings
    ADD CONSTRAINT resale_listings_pkey PRIMARY KEY (id);


--
-- Name: resale_settings resale_settings_event_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resale_settings
    ADD CONSTRAINT resale_settings_event_id_key UNIQUE (event_id);


--
-- Name: resale_settings resale_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resale_settings
    ADD CONSTRAINT resale_settings_pkey PRIMARY KEY (id);


--
-- Name: seat_assignments seat_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seat_assignments
    ADD CONSTRAINT seat_assignments_pkey PRIMARY KEY (id);


--
-- Name: seat_assignments seat_assignments_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seat_assignments
    ADD CONSTRAINT seat_assignments_unique UNIQUE (event_id, seat_category_id, row_number, seat_number);


--
-- Name: seat_categories seat_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seat_categories
    ADD CONSTRAINT seat_categories_pkey PRIMARY KEY (id);


--
-- Name: sellers sellers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sellers
    ADD CONSTRAINT sellers_pkey PRIMARY KEY (id);


--
-- Name: tickets tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_pkey PRIMARY KEY (id);


--
-- Name: tickets tickets_token_id_event_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_token_id_event_id_unique UNIQUE (token_id, event_id);


--
-- Name: tickets tickets_unique_ticket_per_event; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_unique_ticket_per_event UNIQUE (event_id, ticket_number);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: venues venues_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.venues
    ADD CONSTRAINT venues_pkey PRIMARY KEY (id);


--
-- Name: idx_events_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_events_category ON public.events USING btree (category);


--
-- Name: idx_events_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_events_date ON public.events USING btree (date);


--
-- Name: idx_events_seller; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_events_seller ON public.events USING btree (seller_id);


--
-- Name: idx_orders_buyer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_buyer ON public.orders USING btree (buyer_id);


--
-- Name: idx_resale_listings_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_resale_listings_status ON public.resale_listings USING btree (status);


--
-- Name: idx_seat_assignments_availability; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_seat_assignments_availability ON public.seat_assignments USING btree (is_available, reserved_until);


--
-- Name: idx_seat_assignments_event_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_seat_assignments_event_category ON public.seat_assignments USING btree (event_id, seat_category_id);


--
-- Name: idx_seat_assignments_reservations; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_seat_assignments_reservations ON public.seat_assignments USING btree (reserved_by, reserved_until);


--
-- Name: idx_tickets_event; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tickets_event ON public.tickets USING btree (event_id);


--
-- Name: idx_tickets_owner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tickets_owner ON public.tickets USING btree (owner_id);


--
-- Name: seat_categories trigger_create_seats; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_create_seats AFTER INSERT ON public.seat_categories FOR EACH ROW EXECUTE FUNCTION public.trigger_create_seats();


--
-- Name: orders trigger_update_sold_tickets; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_sold_tickets AFTER INSERT OR UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_event_sold_tickets();


--
-- Name: artists update_artists_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_artists_updated_at BEFORE UPDATE ON public.artists FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: events update_events_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: resale_settings update_resale_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_resale_settings_updated_at BEFORE UPDATE ON public.resale_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: buyers buyers_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.buyers
    ADD CONSTRAINT buyers_id_fkey FOREIGN KEY (id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: events events_artist_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_artist_id_fkey FOREIGN KEY (artist_id) REFERENCES public.artists(id);


--
-- Name: events events_seller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.sellers(id);


--
-- Name: events events_venue_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_venue_id_fkey FOREIGN KEY (venue_id) REFERENCES public.venues(id);


--
-- Name: orders orders_buyer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES public.buyers(id);


--
-- Name: orders orders_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id);


--
-- Name: orders orders_seat_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_seat_category_id_fkey FOREIGN KEY (seat_category_id) REFERENCES public.seat_categories(id);


--
-- Name: resale_listings resale_listings_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resale_listings
    ADD CONSTRAINT resale_listings_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.tickets(id);


--
-- Name: resale_settings resale_settings_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resale_settings
    ADD CONSTRAINT resale_settings_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id);


--
-- Name: seat_assignments seat_assignments_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seat_assignments
    ADD CONSTRAINT seat_assignments_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: seat_assignments seat_assignments_seat_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seat_assignments
    ADD CONSTRAINT seat_assignments_seat_category_id_fkey FOREIGN KEY (seat_category_id) REFERENCES public.seat_categories(id) ON DELETE CASCADE;


--
-- Name: seat_assignments seat_assignments_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seat_assignments
    ADD CONSTRAINT seat_assignments_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.tickets(id);


--
-- Name: seat_categories seat_categories_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seat_categories
    ADD CONSTRAINT seat_categories_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: sellers sellers_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sellers
    ADD CONSTRAINT sellers_id_fkey FOREIGN KEY (id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: tickets tickets_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id);


--
-- Name: tickets tickets_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);


--
-- Name: tickets tickets_seat_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_seat_category_id_fkey FOREIGN KEY (seat_category_id) REFERENCES public.seat_categories(id);


--
-- Name: users users_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: buyers Allow authenticated insert for orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated insert for orders" ON public.buyers FOR INSERT WITH CHECK ((auth.role() = 'authenticated'::text));


--
-- Name: buyers Allow authenticated read for orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated read for orders" ON public.buyers FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: tickets Allow reading tickets for marketplace; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow reading tickets for marketplace" ON public.tickets FOR SELECT USING (true);


--
-- Name: tickets Allow updating ticket ownership; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow updating ticket ownership" ON public.tickets FOR UPDATE USING (true);


--
-- Name: events Anyone can view active events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active events" ON public.events FOR SELECT USING ((status = 'active'::text));


--
-- Name: buyers Buyers can read own data; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Buyers can read own data" ON public.buyers FOR SELECT USING ((auth.uid() = id));


--
-- Name: buyers Buyers can update own data; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Buyers can update own data" ON public.buyers FOR UPDATE USING ((auth.uid() = id));


--
-- Name: events Enable insert for authenticated users only; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable insert for authenticated users only" ON public.events FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: buyers Enable insert for users based on user_id; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable insert for users based on user_id" ON public.buyers FOR INSERT WITH CHECK ((( SELECT auth.uid() AS uid) = id));


--
-- Name: sellers Enable insert for users based on user_id; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable insert for users based on user_id" ON public.sellers FOR INSERT WITH CHECK ((( SELECT auth.uid() AS uid) = id));


--
-- Name: artists Enable read access for all users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable read access for all users" ON public.artists FOR SELECT USING (true);


--
-- Name: venues Enable read access for all users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable read access for all users" ON public.venues FOR SELECT USING (true);


--
-- Name: seat_assignments Seat assignments manageable by event sellers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Seat assignments manageable by event sellers" ON public.seat_assignments USING ((EXISTS ( SELECT 1
   FROM public.events e
  WHERE ((e.id = seat_assignments.event_id) AND (e.seller_id = auth.uid())))));


--
-- Name: seat_assignments Seat assignments viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Seat assignments viewable by everyone" ON public.seat_assignments FOR SELECT USING (true);


--
-- Name: events Sellers can manage their own events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Sellers can manage their own events" ON public.events USING ((auth.uid() = seller_id));


--
-- Name: sellers Sellers can read own data; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Sellers can read own data" ON public.sellers FOR SELECT USING ((auth.uid() = id));


--
-- Name: sellers Sellers can update own data; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Sellers can update own data" ON public.sellers FOR UPDATE USING ((auth.uid() = id));


--
-- Name: users Sellers can view customer user data; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Sellers can view customer user data" ON public.users FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ((public.orders o
     JOIN public.buyers b ON ((b.id = o.buyer_id)))
     JOIN public.events e ON ((e.id = o.event_id)))
  WHERE ((b.id = users.id) AND (e.seller_id = auth.uid()) AND (o.status = 'confirmed'::text)))));


--
-- Name: orders Sellers can view orders for their events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Sellers can view orders for their events" ON public.orders FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.events
  WHERE ((events.id = orders.event_id) AND (events.seller_id = auth.uid())))));


--
-- Name: orders Users can create orders for themselves; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create orders for themselves" ON public.orders FOR INSERT WITH CHECK ((auth.uid() = buyer_id));


--
-- Name: tickets Users can create tickets for themselves; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create tickets for themselves" ON public.tickets FOR INSERT WITH CHECK ((auth.uid() = owner_id));


--
-- Name: buyers Users can read own buyer profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read own buyer profile" ON public.buyers FOR SELECT USING ((auth.uid() = id));


--
-- Name: users Users can read own data; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read own data" ON public.users FOR SELECT USING ((auth.uid() = id));


--
-- Name: buyers Users can update own buyer profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own buyer profile" ON public.buyers FOR UPDATE USING ((auth.uid() = id));


--
-- Name: users Users can update own data; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own data" ON public.users FOR UPDATE USING ((auth.uid() = id));


--
-- Name: orders Users can update their own orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own orders" ON public.orders FOR UPDATE USING ((auth.uid() = buyer_id)) WITH CHECK ((auth.uid() = buyer_id));


--
-- Name: orders Users can view their own orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own orders" ON public.orders FOR SELECT USING ((auth.uid() = buyer_id));


--
-- Name: buyers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.buyers ENABLE ROW LEVEL SECURITY;

--
-- Name: events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

--
-- Name: orders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

--
-- Name: resale_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.resale_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: seat_assignments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.seat_assignments ENABLE ROW LEVEL SECURITY;

--
-- Name: sellers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;

--
-- Name: tickets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

--
-- Name: users; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

--
-- Name: venues; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;

--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: -
--

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;


--
-- Name: FUNCTION check_wallet_for_auth(wallet_addr text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.check_wallet_for_auth(wallet_addr text) TO anon;
GRANT ALL ON FUNCTION public.check_wallet_for_auth(wallet_addr text) TO authenticated;
GRANT ALL ON FUNCTION public.check_wallet_for_auth(wallet_addr text) TO service_role;


--
-- Name: FUNCTION confirm_seat_purchase(p_event_id uuid, p_user_id uuid, p_order_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.confirm_seat_purchase(p_event_id uuid, p_user_id uuid, p_order_id uuid) TO anon;
GRANT ALL ON FUNCTION public.confirm_seat_purchase(p_event_id uuid, p_user_id uuid, p_order_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.confirm_seat_purchase(p_event_id uuid, p_user_id uuid, p_order_id uuid) TO service_role;


--
-- Name: FUNCTION create_user_profile(user_id uuid, user_email text, display_name text, user_type text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.create_user_profile(user_id uuid, user_email text, display_name text, user_type text) TO anon;
GRANT ALL ON FUNCTION public.create_user_profile(user_id uuid, user_email text, display_name text, user_type text) TO authenticated;
GRANT ALL ON FUNCTION public.create_user_profile(user_id uuid, user_email text, display_name text, user_type text) TO service_role;


--
-- Name: FUNCTION create_wallet_user_for_auth(wallet_addr text, user_email text, user_display_name text, user_user_type text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.create_wallet_user_for_auth(wallet_addr text, user_email text, user_display_name text, user_user_type text) TO anon;
GRANT ALL ON FUNCTION public.create_wallet_user_for_auth(wallet_addr text, user_email text, user_display_name text, user_user_type text) TO authenticated;
GRANT ALL ON FUNCTION public.create_wallet_user_for_auth(wallet_addr text, user_email text, user_display_name text, user_user_type text) TO service_role;


--
-- Name: FUNCTION get_wallet_user_profile(wallet_addr text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_wallet_user_profile(wallet_addr text) TO anon;
GRANT ALL ON FUNCTION public.get_wallet_user_profile(wallet_addr text) TO authenticated;
GRANT ALL ON FUNCTION public.get_wallet_user_profile(wallet_addr text) TO service_role;


--
-- Name: FUNCTION initialize_seats_for_category(p_event_id uuid, p_seat_category_id uuid, p_total_rows integer, p_seats_per_row integer); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.initialize_seats_for_category(p_event_id uuid, p_seat_category_id uuid, p_total_rows integer, p_seats_per_row integer) TO anon;
GRANT ALL ON FUNCTION public.initialize_seats_for_category(p_event_id uuid, p_seat_category_id uuid, p_total_rows integer, p_seats_per_row integer) TO authenticated;
GRANT ALL ON FUNCTION public.initialize_seats_for_category(p_event_id uuid, p_seat_category_id uuid, p_total_rows integer, p_seats_per_row integer) TO service_role;


--
-- Name: FUNCTION reserve_seats_auto(p_event_id uuid, p_seat_category_id uuid, p_quantity integer, p_user_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.reserve_seats_auto(p_event_id uuid, p_seat_category_id uuid, p_quantity integer, p_user_id uuid) TO anon;
GRANT ALL ON FUNCTION public.reserve_seats_auto(p_event_id uuid, p_seat_category_id uuid, p_quantity integer, p_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.reserve_seats_auto(p_event_id uuid, p_seat_category_id uuid, p_quantity integer, p_user_id uuid) TO service_role;


--
-- Name: FUNCTION trigger_create_seats(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.trigger_create_seats() TO anon;
GRANT ALL ON FUNCTION public.trigger_create_seats() TO authenticated;
GRANT ALL ON FUNCTION public.trigger_create_seats() TO service_role;


--
-- Name: FUNCTION update_event_sold_tickets(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.update_event_sold_tickets() TO anon;
GRANT ALL ON FUNCTION public.update_event_sold_tickets() TO authenticated;
GRANT ALL ON FUNCTION public.update_event_sold_tickets() TO service_role;


--
-- Name: FUNCTION update_updated_at_column(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.update_updated_at_column() TO anon;
GRANT ALL ON FUNCTION public.update_updated_at_column() TO authenticated;
GRANT ALL ON FUNCTION public.update_updated_at_column() TO service_role;


--
-- Name: TABLE artists; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.artists TO anon;
GRANT ALL ON TABLE public.artists TO authenticated;
GRANT ALL ON TABLE public.artists TO service_role;


--
-- Name: TABLE buyers; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.buyers TO anon;
GRANT ALL ON TABLE public.buyers TO authenticated;
GRANT ALL ON TABLE public.buyers TO service_role;


--
-- Name: TABLE events; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.events TO anon;
GRANT ALL ON TABLE public.events TO authenticated;
GRANT ALL ON TABLE public.events TO service_role;


--
-- Name: TABLE orders; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.orders TO anon;
GRANT ALL ON TABLE public.orders TO authenticated;
GRANT ALL ON TABLE public.orders TO service_role;


--
-- Name: TABLE resale_listings; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.resale_listings TO anon;
GRANT ALL ON TABLE public.resale_listings TO authenticated;
GRANT ALL ON TABLE public.resale_listings TO service_role;


--
-- Name: TABLE resale_settings; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.resale_settings TO anon;
GRANT ALL ON TABLE public.resale_settings TO authenticated;
GRANT ALL ON TABLE public.resale_settings TO service_role;


--
-- Name: TABLE seat_assignments; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.seat_assignments TO anon;
GRANT ALL ON TABLE public.seat_assignments TO authenticated;
GRANT ALL ON TABLE public.seat_assignments TO service_role;


--
-- Name: TABLE seat_categories; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.seat_categories TO anon;
GRANT ALL ON TABLE public.seat_categories TO authenticated;
GRANT ALL ON TABLE public.seat_categories TO service_role;


--
-- Name: TABLE seat_availability; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.seat_availability TO anon;
GRANT ALL ON TABLE public.seat_availability TO authenticated;
GRANT ALL ON TABLE public.seat_availability TO service_role;


--
-- Name: TABLE sellers; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.sellers TO anon;
GRANT ALL ON TABLE public.sellers TO authenticated;
GRANT ALL ON TABLE public.sellers TO service_role;


--
-- Name: TABLE tickets; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.tickets TO anon;
GRANT ALL ON TABLE public.tickets TO authenticated;
GRANT ALL ON TABLE public.tickets TO service_role;


--
-- Name: TABLE users; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.users TO anon;
GRANT ALL ON TABLE public.users TO authenticated;
GRANT ALL ON TABLE public.users TO service_role;


--
-- Name: TABLE venues; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.venues TO anon;
GRANT ALL ON TABLE public.venues TO authenticated;
GRANT ALL ON TABLE public.venues TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- PostgreSQL database dump complete
--

\unrestrict yUtW5ZrGxexa5Z448qmSxbaFYR9zSzls9ivnriP3wA3sy0OF5mJxb6Cddasmpa6

