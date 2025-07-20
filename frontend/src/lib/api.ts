import { supabase } from './supabase'
import type { Database, Event, User, Buyer, Seller, BuyerProfile, SellerProfile, Ticket, Order, Artist, ResaleListing, SeatCategory } from './supabase'

// Type aliases for better readability
type EventWithRelations = Event & {
  artists?: Artist
  venues?: Database['public']['Tables']['venues']['Row']
  seat_categories?: SeatCategory[]
}

type TicketWithRelations = Ticket & {
  events?: Event
  artists?: Artist
  venues?: Database['public']['Tables']['venues']['Row']
  seat_categories?: SeatCategory
  orders?: Order
}

// ================================
// EVENTS API
// ================================

export const eventsAPI = {
  // Get all active events with optional filters
  async getEvents(filters?: {
    category?: string
    location?: string
    priceMin?: number
    priceMax?: number
    search?: string
    limit?: number
    offset?: number
  }): Promise<EventWithRelations[]> {
    let query = supabase
      .from('events')
      .select(`
        *,
        artists(id, name, genre, image_url, verified),
        venues(id, name, address, city, state, country),
        seat_categories(id, name, price, capacity, sold)
      `)
      .eq('status', 'active')
      .order('date', { ascending: true })

    // Apply filters
    if (filters?.category) {
      query = query.eq('category', filters.category)
    }
    
    if (filters?.search) {
      query = query.or(`title.ilike.%${filters.search}%,artists.name.ilike.%${filters.search}%`)
    }

    if (filters?.limit) {
      query = query.limit(filters.limit)
    }

    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1)
    }

    const { data, error } = await query
    
    if (error) {
      console.error('Error fetching events:', error)
      throw error
    }
    
    return data || []
  },

  // Get featured events for homepage
  async getFeaturedEvents(): Promise<EventWithRelations[]> {
    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        artists(id, name, genre, image_url, verified),
        venues(id, name, address, city, state, country),
        seat_categories(id, name, price, capacity, sold)
      `)
      .eq('is_featured', true)
      .eq('status', 'active')
      .order('date', { ascending: true })
      .limit(6)

    if (error) {
      console.error('Error fetching featured events:', error)
      throw error
    }
    
    return data || []
  },

  // Get single event with full details
  async getEventById(id: string): Promise<EventWithRelations | null> {
    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        artists(id, name, genre, image_url, verified, description),
        venues(id, name, address, city, state, country, capacity, parking_available, accessibility_features),
        seat_categories(id, name, price, capacity, sold, color, nft_image_url)
      `)
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching event:', error)
      throw error
    }
    
    return data
  },

  // Create new event (for sellers) with smart contract integration
  async createEvent(eventData: {
    title: string
    description?: string
    artist_id: string
    venue_id: string
    date: string
    time: string
    doors_open?: string
    age_restriction?: string
    duration_minutes?: number
    category: string
    poster_image_url?: string
    seat_categories: Array<{
      name: string
      price: number
      capacity: number
      color?: string
      nft_image_url?: string
    }>
  }, organizerWalletAddress?: string): Promise<Event> {
    // Import contract service here to avoid circular dependency
    const { contractService } = await import('./contracts');

    // Calculate total tickets
    const totalTickets = eventData.seat_categories.reduce((sum, cat) => sum + cat.capacity, 0)

    // Get current user for database relations
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Validate wallet address for blockchain operations
    if (!organizerWalletAddress) {
      throw new Error('Wallet address is required for blockchain event creation');
    }

    // Import ethers to validate address format
    const { ethers } = await import('ethers');
    if (!ethers.isAddress(organizerWalletAddress)) {
      throw new Error('Invalid wallet address format');
    }

    // First, create the event in the database (without contract_event_id)
    const { data: event, error: eventError } = await supabase
      .from('events')
      .insert({
        title: eventData.title,
        description: eventData.description,
        artist_id: eventData.artist_id,
        venue_id: eventData.venue_id,
        date: eventData.date,
        time: eventData.time,
        doors_open: eventData.doors_open,
        age_restriction: eventData.age_restriction,
        duration_minutes: eventData.duration_minutes,
        category: eventData.category,
        poster_image_url: eventData.poster_image_url,
        total_tickets: totalTickets,
        seller_id: user.id
      })
      .select()
      .single()

    if (eventError) {
      console.error('Error creating event:', eventError)
      throw eventError
    }

    // Insert seat categories
    const seatCategories = eventData.seat_categories.map(cat => ({
      ...cat,
      event_id: event.id
    }))

    const { error: seatError } = await supabase
      .from('seat_categories')
      .insert(seatCategories)

    if (seatError) {
      console.error('Error creating seat categories:', seatError)
      // Rollback event creation
      await supabase.from('events').delete().eq('id', event.id)
      throw seatError
    }

    // Now create the smart contract event
    try {
      const eventDate = new Date(`${eventData.date} ${eventData.time}`);
      const eventTimestamp = Math.floor(eventDate.getTime() / 1000);

      // Convert seat categories to ticket types for the smart contract
      const ticketTypes = eventData.seat_categories.map(cat => ({
        name: cat.name,
        price: cat.price.toString(), // Price is already in ETH format from frontend
        maxSupply: cat.capacity,
        currentSupply: 0,
        metadataURI: cat.nft_image_url || `ipfs://default-${cat.name.toLowerCase()}`
      }));

      // Debug: Log the data being sent to smart contract
      console.log('Smart contract data:', {
        name: eventData.title,
        description: eventData.description || '',
        eventDate: eventTimestamp,
        eventDateReadable: new Date(eventTimestamp * 1000).toISOString(),
        organizer: organizerWalletAddress,
        ticketTypes
      });

      // Import contract service
      const { contractService } = await import('./contracts');

      const contractResult = await contractService.createContractEvent({
        name: eventData.title,
        description: eventData.description || '',
        eventDate: eventTimestamp,
        organizer: organizerWalletAddress, // Use wallet address as organizer
        ticketTypes
      });

      // Update the event with contract information
      const { data: updatedEvent, error: updateError } = await supabase
        .from('events')
        .update({
          contract_event_id: contractResult.contractEventId
        })
        .eq('id', event.id)
        .select()
        .single()

      if (updateError) {
        console.error('Error updating event with contract info:', updateError)
        // Note: Contract has been created but database update failed
        // This is a partial failure that needs manual intervention
        throw new Error(`Event created but contract integration failed: ${updateError.message}`)
      }

      return updatedEvent
    } catch (contractError) {
      console.error('Error creating smart contract event:', contractError)
      
      // Rollback database changes
      await supabase.from('seat_categories').delete().eq('event_id', event.id)
      await supabase.from('events').delete().eq('id', event.id)
      
      throw new Error(`Failed to create smart contract event: ${contractError.message}`)
    }
  },

  // Get seller's events
  async getSellerEvents(sellerId?: string): Promise<EventWithRelations[]> {
    const userId = sellerId || (await supabase.auth.getUser()).data.user?.id
    
    if (!userId) {
      throw new Error('User not authenticated')
    }

    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        artists(id, name, genre, image_url),
        venues(id, name, city, state),
        seat_categories(id, capacity, sold, price)
      `)
      .eq('seller_id', userId)
      .order('date', { ascending: false })

    if (error) {
      console.error('Error fetching seller events:', error)
      throw error
    }
    
    return data || []
  },

  // Update event
  async updateEvent(eventId: string, updates: Partial<Event>): Promise<Event> {
    const { data, error } = await supabase
      .from('events')
      .update(updates)
      .eq('id', eventId)
      .select()
      .single()

    if (error) {
      console.error('Error updating event:', error)
      throw error
    }
    
    return data
  }
}

// ================================
// USERS API
// ================================

export const usersAPI = {
  // Get user profile
  async getUser(userId?: string): Promise<User | null> {
    const id = userId || (await supabase.auth.getUser()).data.user?.id
    
    console.log('usersAPI.getUser called with ID:', id);
    
    if (!id) {
      console.log('No user ID provided, returning null');
      return null;
    }

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single()

    console.log('Database query result:', { data, error, userId: id });

    if (error) {
      if (error.code === 'PGRST116') {
        // User doesn't exist
        console.log('User not found in database (PGRST116)');
        return null
      }
      console.error('Error fetching user:', error)
      throw error
    }
    
    console.log('Returning user data:', data);
    return data
  },

  // Create user (called after signup)
  async createUser(userId: string, userData: {
    email: string
    display_name?: string
    user_type: 'buyer' | 'seller'
  }): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .insert({
        id: userId,
        email: userData.email,
        display_name: userData.display_name,
        user_type: userData.user_type
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating user:', error)
      console.error('User creation error details:', {
        error,
        userId,
        userData,
        code: error.code,
        message: error.message,
        details: error.details
      })
      throw error
    }
    
    return data
  },

  // Update user profile
  async updateUser(userId: string, updates: Partial<User>): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error updating user:', error)
      throw error
    }
    
    return data
  }
}

// ================================
// BUYERS API
// ================================

export const buyersAPI = {
  // Get buyer profile
  async getBuyer(userId?: string): Promise<Buyer | null> {
    const id = userId || (await supabase.auth.getUser()).data.user?.id
    
    if (!id) return null

    const { data, error } = await supabase
      .from('buyers')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // Buyer doesn't exist
        return null
      }
      console.error('Error fetching buyer:', error)
      throw error
    }
    
    return data
  },

  // Create buyer profile (called after signup)
  async createBuyer(userId: string, buyerData: Partial<Buyer> = {}): Promise<Buyer> {
    const { data, error } = await supabase
      .from('buyers')
      .insert({
        id: userId,
        ...buyerData
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating buyer:', error)
      console.error('Buyer creation error details:', {
        error,
        userId,
        buyerData,
        code: error.code,
        message: error.message,
        details: error.details
      })
      throw error
    }
    
    return data
  },

  // Update buyer profile
  async updateBuyer(userId: string, updates: Partial<Buyer>): Promise<Buyer> {
    const { data, error } = await supabase
      .from('buyers')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error updating buyer:', error)
      throw error
    }
    
    return data
  },

  // Get full buyer profile with user data
  async getBuyerProfile(userId?: string): Promise<BuyerProfile | null> {
    const id = userId || (await supabase.auth.getUser()).data.user?.id
    
    if (!id) return null

    const { data, error } = await supabase
      .from('users')
      .select(`
        *,
        buyers(*)
      `)
      .eq('id', id)
      .eq('user_type', 'buyer')
      .single()

    if (error) {
      console.error('Error fetching buyer profile:', error)
      return null
    }
    
    if (!data.buyers) return null
    
    return { ...data, ...data.buyers } as BuyerProfile
  }
}

// ================================
// SELLERS API
// ================================

export const sellersAPI = {
  // Get seller profile
  async getSeller(userId?: string): Promise<Seller | null> {
    const id = userId || (await supabase.auth.getUser()).data.user?.id
    
    if (!id) return null

    const { data, error } = await supabase
      .from('sellers')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // Seller doesn't exist
        return null
      }
      console.error('Error fetching seller:', error)
      throw error
    }
    
    return data
  },

  // Create seller profile (called after signup)
  async createSeller(userId: string, sellerData: Partial<Seller> = {}): Promise<Seller> {
    const { data, error } = await supabase
      .from('sellers')
      .insert({
        id: userId,
        ...sellerData
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating seller:', error)
      console.error('Seller creation error details:', {
        error,
        userId,
        sellerData,
        code: error.code,
        message: error.message,
        details: error.details
      })
      throw error
    }
    
    return data
  },

  // Update seller profile
  async updateSeller(userId: string, updates: Partial<Seller>): Promise<Seller> {
    const { data, error } = await supabase
      .from('sellers')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error updating seller:', error)
      throw error
    }
    
    return data
  },

  // Get full seller profile with user data
  async getSellerProfile(userId?: string): Promise<SellerProfile | null> {
    const id = userId || (await supabase.auth.getUser()).data.user?.id
    
    if (!id) return null

    const { data, error } = await supabase
      .from('users')
      .select(`
        *,
        sellers(*)
      `)
      .eq('id', id)
      .eq('user_type', 'seller')
      .single()

    if (error) {
      console.error('Error fetching seller profile:', error)
      return null
    }
    
    if (!data.sellers) return null
    
    return { ...data, ...data.sellers } as SellerProfile
  }
}

// ================================
// ARTISTS API
// ================================

export const artistsAPI = {
  // Get all artists with optional filters
  async getArtists(filters?: {
    genre?: string
    search?: string
    verified?: boolean
    limit?: number
  }): Promise<Artist[]> {
    let query = supabase
      .from('artists')
      .select('*')
      .order('followers', { ascending: false })

    if (filters?.genre) {
      query = query.eq('genre', filters.genre)
    }
    
    if (filters?.search) {
      query = query.ilike('name', `%${filters.search}%`)
    }
    
    if (filters?.verified !== undefined) {
      query = query.eq('verified', filters.verified)
    }

    if (filters?.limit) {
      query = query.limit(filters.limit)
    }

    const { data, error } = await query
    
    if (error) {
      console.error('Error fetching artists:', error)
      throw error
    }
    
    return data || []
  },

  // Get artist by ID with upcoming events count
  async getArtistById(id: string): Promise<(Artist & { upcoming_shows: number }) | null> {
    const [artistResult, eventsResult] = await Promise.all([
      supabase.from('artists').select('*').eq('id', id).single(),
      supabase.from('events').select('id').eq('artist_id', id).eq('status', 'active')
    ])

    if (artistResult.error) {
      console.error('Error fetching artist:', artistResult.error)
      throw artistResult.error
    }
    
    return {
      ...artistResult.data,
      upcoming_shows: eventsResult.data?.length || 0
    }
  },

  // Create new artist
  async createArtist(artistData: {
    name: string
    genre?: string
    image_url?: string
    description?: string
  }): Promise<Artist> {
    const { data, error } = await supabase
      .from('artists')
      .insert(artistData)
      .select()
      .single()

    if (error) {
      console.error('Error creating artist:', error)
      throw error
    }
    
    return data
  }
}

// ================================
// SEAT ASSIGNMENTS API  
// ================================

export const seatAssignmentsAPI = {
  // Reserve seats temporarily (10 minutes)
  async reserveSeats(eventId: string, categoryId: string, quantity: number, userId: string) {
    const { data, error } = await supabase.rpc('reserve_seats_auto', {
      p_event_id: eventId,
      p_seat_category_id: categoryId,
      p_quantity: quantity,
      p_user_id: userId
    });

    if (error) {
      console.error('Error reserving seats:', error);
      throw error;
    }

    return data || [];
  },

  // Confirm seat purchase after payment success
  async confirmSeatPurchase(eventId: string, userId: string, orderId: string) {
    const { data, error } = await supabase.rpc('confirm_seat_purchase', {
      p_event_id: eventId,
      p_user_id: userId,
      p_order_id: orderId
    });

    if (error) {
      console.error('Error confirming seat purchase:', error);
      throw error;
    }

    return data;
  },

  // Get seat availability for an event
  async getSeatAvailability(eventId: string) {
    const { data, error } = await supabase
      .from('seat_availability')
      .select('*')
      .eq('event_id', eventId);

    if (error) {
      console.error('Error fetching seat availability:', error);
      throw error;
    }

    return data || [];
  }
};

// ================================
// TICKETS API  
// ================================

export const ticketsAPI = {
  // Get user's tickets
  async getUserTickets(userId?: string): Promise<TicketWithRelations[]> {
    const id = userId || (await supabase.auth.getUser()).data.user?.id
    
    if (!id) {
      throw new Error('User not authenticated')
    }

    const { data, error } = await supabase
      .from('tickets')
      .select(`
        *,
        events!tickets_event_id_fkey(
          id, title, date, time, poster_image_url, category,
          artists!events_artist_id_fkey(id, name, image_url),
          venues!events_venue_id_fkey(id, name, city, state)
        ),
        seat_categories!tickets_seat_category_id_fkey(id, name, price, color),
        orders!tickets_order_id_fkey(id, purchase_date, total_price, transaction_hash)
      `)
      .eq('owner_id', id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching user tickets:', error)
      throw error
    }
    
    return data || []
  },

  // Transfer ticket to another user
  async transferTicket(ticketId: string, newOwnerId: string): Promise<Ticket> {
    const { data, error } = await supabase
      .from('tickets')
      .update({ owner_id: newOwnerId })
      .eq('id', ticketId)
      .select()
      .single()

    if (error) {
      console.error('Error transferring ticket:', error)
      throw error
    }
    
    return data
  },

  // Get ticket by ID
  async getTicketById(ticketId: string): Promise<TicketWithRelations | null> {
    const { data, error } = await supabase
      .from('tickets')
      .select(`
        *,
        events(id, title, date, time, poster_image_url),
        artists(id, name),
        venues(id, name, city),
        seat_categories(id, name, price)
      `)
      .eq('id', ticketId)
      .single()

    if (error) {
      console.error('Error fetching ticket:', error)
      throw error
    }
    
    return data
  },

  // Create new ticket after blockchain purchase
  async createTicket(ticketData: {
    token_id: number
    order_id: string
    event_id: string
    seat_category_id: string
    ticket_number: string
    seat_row?: string
    seat_number?: string
    owner_id?: string
  }): Promise<Ticket> {
    const user = await supabase.auth.getUser()
    
    if (!user.data.user) {
      throw new Error('User not authenticated')
    }

    const { data, error } = await supabase
      .from('tickets')
      .insert({
        ...ticketData,
        owner_id: ticketData.owner_id || user.data.user.id,
        qr_code: `QR-${ticketData.ticket_number}`, // Generate QR code string
        is_used: false
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating ticket:', error)
      throw error
    }
    
    return data
  },

  // Get seat categories for an event
  async getEventSeatCategories(eventId: string): Promise<SeatCategory[]> {
    const { data, error } = await supabase
      .from('seat_categories')
      .select('*')
      .eq('event_id', eventId)

    if (error) {
      console.error('Error fetching seat categories:', error)
      throw error
    }
    
    return data || []
  },

  // Find seat category ID by event and category name
  async findSeatCategoryId(eventId: string, categoryName: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('seat_categories')
      .select('id')
      .eq('event_id', eventId)
      .ilike('name', categoryName) // Case-insensitive match
      .single()

    if (error) {
      console.warn(`Seat category '${categoryName}' not found for event ${eventId}:`, error)
      return null
    }
    
    return data?.id || null
  },

  // Get real-time seat availability for an event
  async getEventSeatAvailability(eventId: string): Promise<{
    categories: Array<{
      id: string
      name: string
      price: number
      capacity: number
      sold: number
      available: number
      color?: string
    }>
    occupiedSeats: Array<{
      seat_row: string
      seat_number: string
      seat_category_id: string
    }>
  }> {
    // Get seat categories with current sold count
    const { data: categories, error: catError } = await supabase
      .from('seat_categories')
      .select('id, name, price, capacity, sold, color')
      .eq('event_id', eventId)

    if (catError) {
      console.error('Error fetching seat categories:', catError)
      throw catError
    }

    // Get all sold seats for this event
    const { data: tickets, error: ticketError } = await supabase
      .from('tickets')
      .select('seat_row, seat_number, seat_category_id')
      .eq('event_id', eventId)
      .not('seat_row', 'is', null)
      .not('seat_number', 'is', null)

    if (ticketError) {
      console.error('Error fetching sold tickets:', ticketError)
      throw ticketError
    }

    const occupiedSeats = tickets || []

    // Calculate real availability
    const categoriesWithAvailability = (categories || []).map(cat => ({
      ...cat,
      sold: cat.sold || 0,
      available: cat.capacity - (cat.sold || 0)
    }))

    return {
      categories: categoriesWithAvailability,
      occupiedSeats
    }
  },

  // Check if specific seats are available
  async checkSeatsAvailability(eventId: string, seats: Array<{
    row: string
    number: string
    categoryId: string
  }>): Promise<{
    available: boolean
    conflicts: Array<{
      row: string
      number: string
    }>
  }> {
    const seatChecks = seats.map(seat => 
      supabase
        .from('tickets')
        .select('id')
        .eq('event_id', eventId)
        .eq('seat_row', seat.row)
        .eq('seat_number', seat.number)
        .single()
    )

    const results = await Promise.allSettled(seatChecks)
    const conflicts: Array<{ row: string; number: string }> = []

    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.data) {
        // Seat is occupied
        conflicts.push({
          row: seats[index].row,
          number: seats[index].number
        })
      }
    })

    return {
      available: conflicts.length === 0,
      conflicts
    }
  }
}

// ================================
// ORDERS API
// ================================

export const ordersAPI = {
  // Create new order
  async createOrder(orderData: {
    event_id: string
    seat_category_id: string
    quantity: number
    unit_price: number
    total_price: number
    status?: string
    transaction_hash?: string
    buyer_id?: string // Optional: allow passing buyer_id directly
  }): Promise<Order> {
    // If buyer_id is provided directly, use it (for wallet auth)
    let buyerId: string | null = orderData.buyer_id || null;
    
    if (!buyerId) {
      // Try Supabase auth first (for email-authenticated users)
      try {
        const user = await supabase.auth.getUser()
        console.log('Supabase auth user:', user.data.user);
        if (user.data.user) {
          buyerId = user.data.user.id;
          console.log('Using Supabase user ID:', buyerId);
        }
      } catch (error) {
        console.log('No Supabase auth session found, checking custom auth:', error);
      }
      
      // If no Supabase auth, try custom auth (for wallet-authenticated users)
      if (!buyerId) {
        try {
          const { auth } = await import('./auth');
          const authUser = await auth.getCurrentUser();
          console.log('Custom auth user:', authUser);
          if (authUser?.userProfile?.id) {
            buyerId = authUser.userProfile.id;
            console.log('Using custom auth user ID:', buyerId);
          } else if (authUser?.id) {
            buyerId = authUser.id;
            console.log('Using custom auth fallback ID:', buyerId);
          }
        } catch (error) {
          console.error('Failed to get auth user:', error);
        }
      }
      
      if (!buyerId) {
        console.error('No user ID found from either auth system');
        throw new Error('User not authenticated. Please sign in to continue.')
      }
    } else {
      console.log('Using provided buyer ID:', buyerId);
    }
    
    // Ensure buyer record exists in database
    const { data: existingBuyer, error: buyerCheckError } = await supabase
      .from('buyers')
      .select('id')
      .eq('id', buyerId)
      .single()
    
    if (buyerCheckError && buyerCheckError.code === 'PGRST116') {
      // Buyer doesn't exist, create one
      console.log('Buyer record not found, creating one...');
      const { error: createBuyerError } = await supabase
        .from('buyers')
        .insert({
          id: buyerId
        })
      
      if (createBuyerError) {
        console.error('Error creating buyer record:', createBuyerError);
        throw new Error('Failed to create buyer profile');
      }
      console.log('Buyer record created successfully');
    } else if (buyerCheckError) {
      console.error('Error checking buyer:', buyerCheckError);
      throw new Error('Failed to verify buyer profile');
    }
    
    console.log('Final buyer ID for order creation:', buyerId);

    const { data, error } = await supabase
      .from('orders')
      .insert({
        ...orderData,
        buyer_id: buyerId
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating order:', error)
      throw error
    }
    
    return data
  },

  // Get user's order history
  async getUserOrders(userId?: string, filters?: {
    status?: string
    search?: string
    limit?: number
  }): Promise<(Order & { events?: Event; artists?: Artist; venues?: any; seat_categories?: SeatCategory })[]> {
    const id = userId || (await supabase.auth.getUser()).data.user?.id
    
    if (!id) {
      throw new Error('User not authenticated')
    }

    let query = supabase
      .from('orders')
      .select(`
        *,
        events(id, title, date, poster_image_url),
        artists(id, name),
        venues(id, name, city),
        seat_categories(id, name)
      `)
      .eq('buyer_id', id)
      .order('purchase_date', { ascending: false })

    if (filters?.status) {
      query = query.eq('status', filters.status)
    }

    if (filters?.limit) {
      query = query.limit(filters.limit)
    }

    const { data, error } = await query
    
    if (error) {
      console.error('Error fetching user orders:', error)
      throw error
    }
    
    return data || []
  },

  // Update order status
  async updateOrderStatus(orderId: string, status: string, transactionHash?: string): Promise<Order> {
    const updateData: any = { status }
    if (transactionHash) updateData.transaction_hash = transactionHash

    const { data, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .select()
      .single()

    if (error) {
      console.error('Error updating order status:', error)
      throw error
    }
    
    return data
  },

  // Get order statistics for user
  async getOrderStats(userId?: string): Promise<{
    totalOrders: number
    totalSpent: number
    pendingOrders: number
    confirmedOrders: number
  }> {
    const id = userId || (await supabase.auth.getUser()).data.user?.id
    
    if (!id) {
      throw new Error('User not authenticated')
    }

    const { data, error } = await supabase
      .from('orders')
      .select('status, total_price')
      .eq('buyer_id', id)

    if (error) {
      console.error('Error fetching order stats:', error)
      throw error
    }

    const orders = data || []
    
    return {
      totalOrders: orders.length,
      totalSpent: orders.reduce((sum, order) => sum + order.total_price, 0),
      pendingOrders: orders.filter(order => order.status === 'pending').length,
      confirmedOrders: orders.filter(order => order.status === 'confirmed').length
    }
  }
}

// ================================
// RESALE API
// ================================

export const resaleAPI = {
  // Get active resale listings
  async getResaleListings(filters?: {
    category?: string
    priceMax?: number
    search?: string
    limit?: number
  }): Promise<(ResaleListing & { 
    tickets?: TicketWithRelations
    users?: User 
  })[]> {
    let query = supabase
      .from('resale_listings')
      .select(`
        *,
        tickets(
          id,
          ticket_number,
          seat_row,
          seat_number,
          events(id, title, date, poster_image_url, category),
          seat_categories(id, name, price)
        ),
        users!seller_id(id, display_name, avatar_url)
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (filters?.category) {
      query = query.eq('tickets.events.category', filters.category)
    }

    if (filters?.priceMax) {
      query = query.lte('resale_price', filters.priceMax)
    }

    if (filters?.limit) {
      query = query.limit(filters.limit)
    }

    const { data, error } = await query
    
    if (error) {
      console.error('Error fetching resale listings:', error)
      throw error
    }
    
    return data || []
  },

  // Create resale listing
  async createResaleListing(listingData: {
    ticket_id: string
    resale_price: number
    expires_at?: string
  }): Promise<ResaleListing> {
    const user = await supabase.auth.getUser()
    
    if (!user.data.user) {
      throw new Error('User not authenticated')
    }

    // Get original ticket price
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('seat_categories(price)')
      .eq('id', listingData.ticket_id)
      .single()

    if (ticketError) {
      console.error('Error fetching ticket for resale:', ticketError)
      throw ticketError
    }

    const originalPrice = ticket?.seat_categories?.price || 0

    const { data, error } = await supabase
      .from('resale_listings')
      .insert({
        ...listingData,
        seller_id: user.data.user.id,
        original_price: originalPrice
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating resale listing:', error)
      throw error
    }
    
    return data
  },

  // Cancel resale listing
  async cancelResaleListing(listingId: string): Promise<ResaleListing> {
    const { data, error } = await supabase
      .from('resale_listings')
      .update({ status: 'cancelled' })
      .eq('id', listingId)
      .select()
      .single()

    if (error) {
      console.error('Error cancelling resale listing:', error)
      throw error
    }
    
    return data
  }
}

// ================================
// SELLER ANALYTICS API
// ================================

export const analyticsAPI = {
  // Get comprehensive seller analytics
  async getSellerAnalytics(sellerId?: string): Promise<{
    totalRevenue: number
    totalTicketsSold: number
    averageTicketPrice: number
    conversionRate: number
    eventsCount: number
    ordersCount: number
    recentOrders: Order[]
    topEvents: Event[]
    monthlyRevenue: Array<{ month: string; revenue: number }>
  }> {
    const id = sellerId || (await supabase.auth.getUser()).data.user?.id
    
    if (!id) {
      throw new Error('User not authenticated')
    }

    // Get events and orders in parallel
    const [eventsResult, ordersResult] = await Promise.all([
      supabase
        .from('events')
        .select('id, title, total_tickets, sold_tickets')
        .eq('seller_id', id),
      supabase
        .from('orders')
        .select(`
          *,
          events!inner(seller_id)
        `)
        .eq('events.seller_id', id)
        .eq('status', 'confirmed')
    ])

    if (eventsResult.error) throw eventsResult.error
    if (ordersResult.error) throw ordersResult.error

    const events = eventsResult.data || []
    const orders = ordersResult.data || []

    const totalRevenue = orders.reduce((sum, order) => sum + order.total_price, 0)
    const totalTicketsSold = orders.reduce((sum, order) => sum + order.quantity, 0)
    const totalTicketsAvailable = events.reduce((sum, event) => sum + (event.total_tickets || 0), 0)

    // Calculate monthly revenue (last 6 months)
    const monthlyRevenue = Array.from({ length: 6 }, (_, i) => {
      const date = new Date()
      date.setMonth(date.getMonth() - i)
      const monthStr = date.toISOString().slice(0, 7) // YYYY-MM format
      
      const monthRevenue = orders
        .filter(order => order.purchase_date?.startsWith(monthStr))
        .reduce((sum, order) => sum + order.total_price, 0)
      
      return {
        month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        revenue: monthRevenue
      }
    }).reverse()

    return {
      totalRevenue,
      totalTicketsSold,
      averageTicketPrice: totalTicketsSold > 0 ? totalRevenue / totalTicketsSold : 0,
      conversionRate: totalTicketsAvailable > 0 ? (totalTicketsSold / totalTicketsAvailable) * 100 : 0,
      eventsCount: events.length,
      ordersCount: orders.length,
      recentOrders: orders.slice(0, 10),
      topEvents: events.sort((a, b) => (b.sold_tickets || 0) - (a.sold_tickets || 0)).slice(0, 5),
      monthlyRevenue
    }
  },

  // Get customer analytics for seller
  async getSellerCustomers(sellerId?: string): Promise<Array<{
    id: string
    customer_id: string
    total_purchases: number
    total_spent: number
    last_purchase_date: string | null
    status: string
    users?: User
  }>> {
    const id = sellerId || (await supabase.auth.getUser()).data.user?.id
    
    if (!id) {
      throw new Error('User not authenticated')
    }

    const { data, error } = await supabase
      .from('customer_profiles')
      .select(`
        *,
        users!customer_id(id, display_name, email, avatar_url)
      `)
      .eq('seller_id', id)
      .order('total_spent', { ascending: false })

    if (error) {
      console.error('Error fetching seller customers:', error)
      throw error
    }
    
    return data || []
  }
}

// ================================
// VENUES API
// ================================

export const venuesAPI = {
  // Get all venues
  async getVenues(filters?: {
    city?: string
    country?: string
    search?: string
  }): Promise<Database['public']['Tables']['venues']['Row'][]> {
    let query = supabase
      .from('venues')
      .select('*')
      .order('name')

    if (filters?.city) {
      query = query.eq('city', filters.city)
    }

    if (filters?.country) {
      query = query.eq('country', filters.country)
    }

    if (filters?.search) {
      query = query.or(`name.ilike.%${filters.search}%,city.ilike.%${filters.search}%`)
    }

    const { data, error } = await query
    
    if (error) {
      console.error('Error fetching venues:', error)
      throw error
    }
    
    return data || []
  },

  // Create new venue
  async createVenue(venueData: {
    name: string
    address: string
    city: string
    state?: string
    country: string
    capacity?: number
    parking_available?: boolean
    accessibility_features?: string[]
  }): Promise<Database['public']['Tables']['venues']['Row']> {
    const { data, error } = await supabase
      .from('venues')
      .insert(venueData)
      .select()
      .single()

    if (error) {
      console.error('Error creating venue:', error)
      throw error
    }
    
    return data
  }
}

// ================================
// UTILITY FUNCTIONS
// ================================

export const utilsAPI = {
  // Check if user owns ticket
  async userOwnsTicket(ticketId: string, userId?: string): Promise<boolean> {
    const id = userId || (await supabase.auth.getUser()).data.user?.id
    
    if (!id) return false

    const { data, error } = await supabase
      .from('tickets')
      .select('id')
      .eq('id', ticketId)
      .eq('owner_id', id)
      .single()

    return !error && !!data
  },

  // Get event categories
  async getEventCategories(): Promise<string[]> {
    const { data, error } = await supabase
      .from('events')
      .select('category')
      .not('category', 'is', null)

    if (error) {
      console.error('Error fetching categories:', error)
      return ['Concert', 'Festival', 'Theater', 'Sports', 'Comedy', 'Conference']
    }

    const categories = [...new Set(data.map(event => event.category))]
    return categories.sort()
  },

  // Search across multiple tables
  async globalSearch(query: string, limit = 20): Promise<{
    events: EventWithRelations[]
    artists: Artist[]
    venues: Database['public']['Tables']['venues']['Row'][]
  }> {
    const [eventsResult, artistsResult, venuesResult] = await Promise.all([
      eventsAPI.getEvents({ search: query, limit: Math.floor(limit / 3) }),
      artistsAPI.getArtists({ search: query, limit: Math.floor(limit / 3) }),
      venuesAPI.getVenues({ search: query })
    ])

    return {
      events: eventsResult,
      artists: artistsResult,
      venues: venuesResult.slice(0, Math.floor(limit / 3))
    }
  }
}