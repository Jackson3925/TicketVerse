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

  // Create new event (for sellers)
  async createEvent(eventData: {
    title: string
    description?: string
    artist_id: string
    venue_id: string
    date: string
    time: string
    category: string
    poster_image_url?: string
    seat_categories: Array<{
      name: string
      price: number
      capacity: number
      color?: string
      nft_image_url?: string
    }>
  }): Promise<Event> {
    // Calculate total tickets
    const totalTickets = eventData.seat_categories.reduce((sum, cat) => sum + cat.capacity, 0)

    // Insert event
    const { data: event, error: eventError } = await supabase
      .from('events')
      .insert({
        title: eventData.title,
        description: eventData.description,
        artist_id: eventData.artist_id,
        venue_id: eventData.venue_id,
        date: eventData.date,
        time: eventData.time,
        category: eventData.category,
        poster_image_url: eventData.poster_image_url,
        total_tickets: totalTickets,
        seller_id: (await supabase.auth.getUser()).data.user?.id
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
      throw seatError
    }

    return event
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
    
    if (!id) return null

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // User doesn't exist
        return null
      }
      console.error('Error fetching user:', error)
      throw error
    }
    
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
        events(id, title, date, time, poster_image_url, category),
        artists(id, name, image_url),
        venues(id, name, city, state),
        seat_categories(id, name, price, color),
        orders(id, purchase_date, total_price, transaction_hash)
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
  }): Promise<Order> {
    const user = await supabase.auth.getUser()
    
    if (!user.data.user) {
      throw new Error('User not authenticated')
    }

    const { data, error } = await supabase
      .from('orders')
      .insert({
        ...orderData,
        buyer_id: user.data.user.id
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