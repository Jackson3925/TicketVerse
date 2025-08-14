import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Event, Ticket, Order, ResaleListing } from '@/lib/supabase'

// ================================
// REAL-TIME EVENTS HOOK
// ================================

export const useRealtimeEvents = (filters?: {
  category?: string
  seller_id?: string
  featured_only?: boolean
}) => {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const loadEvents = useCallback(async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('events')
        .select('*')
        .eq('status', 'active')
        .order('date', { ascending: true })

      if (filters?.category) {
        query = query.eq('category', filters.category)
      }

      if (filters?.seller_id) {
        query = query.eq('seller_id', filters.seller_id)
      }

      if (filters?.featured_only) {
        query = query.eq('is_featured', true)
      }

      const { data, error } = await query

      if (error) throw error
      setEvents(data || [])
      setError(null)
    } catch (err) {
      console.error('Error loading events:', err)
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    loadEvents()

    // Subscribe to real-time changes
    const subscription = supabase
      .channel('events_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events'
        },
        (payload) => {
          console.log('Events change received:', payload)

          if (payload.eventType === 'INSERT') {
            const newEvent = payload.new as Event
            if (newEvent.status === 'active') {
              setEvents(prev => {
                // Check if event already exists
                if (prev.some(e => e.id === newEvent.id)) return prev
                return [newEvent, ...prev].sort((a, b) => 
                  new Date(a.date).getTime() - new Date(b.date).getTime()
                )
              })
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedEvent = payload.new as Event
            setEvents(prev => prev.map(event => 
              event.id === updatedEvent.id ? updatedEvent : event
            ))
          } else if (payload.eventType === 'DELETE') {
            const deletedEvent = payload.old as Event
            setEvents(prev => prev.filter(event => event.id !== deletedEvent.id))
          }
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [loadEvents])

  return { events, loading, error, refetch: loadEvents }
}

// ================================
// REAL-TIME TICKETS HOOK
// ================================

export const useRealtimeTickets = (userId?: string) => {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const loadTickets = useCallback(async () => {
    if (!userId) {
      setTickets([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('tickets')
        .select(`
          *,
          events!tickets_event_id_fkey(
            id, title, date, time, poster_image_url, category, contract_event_id,
            artists!events_artist_id_fkey(id, name, image_url),
            venues!events_venue_id_fkey(id, name, city, state)
          ),
          seat_categories!tickets_seat_category_id_fkey(id, name, price, color),
          orders!tickets_order_id_fkey(id, purchase_date, total_price, transaction_hash)
        `)
        .eq('owner_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setTickets(data || [])
      setError(null)
    } catch (err) {
      console.error('Error loading tickets:', err)
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    loadTickets()

    if (!userId) return

    // Subscribe to ticket changes for this user
    const subscription = supabase
      .channel(`tickets_user_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tickets',
          filter: `owner_id=eq.${userId}`
        },
        (payload) => {
          console.log('Ticket change received:', payload)

          if (payload.eventType === 'INSERT') {
            const newTicket = payload.new as Ticket
            setTickets(prev => [newTicket, ...prev])
          } else if (payload.eventType === 'UPDATE') {
            const updatedTicket = payload.new as Ticket
            setTickets(prev => prev.map(ticket => 
              ticket.id === updatedTicket.id ? updatedTicket : ticket
            ))
          } else if (payload.eventType === 'DELETE') {
            const deletedTicket = payload.old as Ticket
            setTickets(prev => prev.filter(ticket => ticket.id !== deletedTicket.id))
          }
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [loadTickets, userId])

  return { tickets, loading, error, refetch: loadTickets }
}

// ================================
// REAL-TIME ORDERS HOOK
// ================================

export const useRealtimeOrders = (userId?: string) => {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const loadOrders = useCallback(async () => {
    if (!userId) {
      setOrders([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          events(id, title, date, poster_image_url),
          seat_categories(id, name, price)
        `)
        .eq('buyer_id', userId)
        .order('purchase_date', { ascending: false })

      if (error) throw error
      setOrders(data || [])
      setError(null)
    } catch (err) {
      console.error('Error loading orders:', err)
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    loadOrders()

    if (!userId) return

    // Subscribe to order changes for this user
    const subscription = supabase
      .channel(`orders_user_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `buyer_id=eq.${userId}`
        },
        (payload) => {
          console.log('Order change received:', payload)

          if (payload.eventType === 'INSERT') {
            const newOrder = payload.new as Order
            setOrders(prev => [newOrder, ...prev])
          } else if (payload.eventType === 'UPDATE') {
            const updatedOrder = payload.new as Order
            setOrders(prev => prev.map(order => 
              order.id === updatedOrder.id ? updatedOrder : order
            ))
          } else if (payload.eventType === 'DELETE') {
            const deletedOrder = payload.old as Order
            setOrders(prev => prev.filter(order => order.id !== deletedOrder.id))
          }
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [loadOrders, userId])

  return { orders, loading, error, refetch: loadOrders }
}

// ================================
// REAL-TIME RESALE LISTINGS HOOK
// ================================

export const useRealtimeResaleListings = (filters?: {
  category?: string
  max_price?: number
}) => {
  const [listings, setListings] = useState<ResaleListing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const loadListings = useCallback(async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('resale_listings')
        .select(`
          *,
          tickets(
            id,
            ticket_number,
            events(id, title, date, poster_image_url, category),
            seat_categories(id, name, price)
          ),
          users!seller_id(id, display_name)
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (filters?.max_price) {
        query = query.lte('resale_price', filters.max_price)
      }

      const { data, error } = await query

      if (error) throw error
      
      let filteredData = data || []
      
      // Filter by category if provided (since we can't filter on nested fields directly)
      if (filters?.category) {
        filteredData = filteredData.filter(listing => 
          (listing.tickets as any)?.events?.category === filters.category
        )
      }

      setListings(filteredData)
      setError(null)
    } catch (err) {
      console.error('Error loading resale listings:', err)
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    loadListings()

    // Subscribe to resale listing changes
    const subscription = supabase
      .channel('resale_listings_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'resale_listings'
        },
        (payload) => {
          console.log('Resale listing change received:', payload)

          if (payload.eventType === 'INSERT') {
            const newListing = payload.new as ResaleListing
            if (newListing.status === 'active') {
              setListings(prev => [newListing, ...prev])
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedListing = payload.new as ResaleListing
            setListings(prev => prev.map(listing => 
              listing.id === updatedListing.id ? updatedListing : listing
            ))
          } else if (payload.eventType === 'DELETE') {
            const deletedListing = payload.old as ResaleListing
            setListings(prev => prev.filter(listing => listing.id !== deletedListing.id))
          }
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [loadListings])

  return { listings, loading, error, refetch: loadListings }
}

// ================================
// REAL-TIME EVENT TICKET AVAILABILITY HOOK
// ================================

export const useRealtimeEventAvailability = (eventId: string) => {
  const [availability, setAvailability] = useState<{
    total_tickets: number
    sold_tickets: number
    remaining: number
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const loadAvailability = useCallback(async () => {
    if (!eventId) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('events')
        .select('total_tickets, sold_tickets')
        .eq('id', eventId)
        .single()

      if (error) throw error

      if (data) {
        setAvailability({
          total_tickets: data.total_tickets || 0,
          sold_tickets: data.sold_tickets || 0,
          remaining: (data.total_tickets || 0) - (data.sold_tickets || 0)
        })
      }
      setError(null)
    } catch (err) {
      console.error('Error loading event availability:', err)
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [eventId])

  useEffect(() => {
    loadAvailability()

    // Subscribe to changes for this specific event
    const subscription = supabase
      .channel(`event_${eventId}_availability`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'events',
          filter: `id=eq.${eventId}`
        },
        (payload) => {
          console.log('Event availability change received:', payload)
          const updatedEvent = payload.new as Event
          
          setAvailability({
            total_tickets: updatedEvent.total_tickets || 0,
            sold_tickets: updatedEvent.sold_tickets || 0,
            remaining: (updatedEvent.total_tickets || 0) - (updatedEvent.sold_tickets || 0)
          })
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [loadAvailability, eventId])

  return { availability, loading, error, refetch: loadAvailability }
}

// ================================
// REAL-TIME SEAT CATEGORIES AVAILABILITY HOOK
// ================================

export const useRealtimeSeatCategories = (eventId: string) => {
  const [seatCategories, setSeatCategories] = useState<Array<{
    id: string
    name: string
    price: number
    capacity: number
    sold: number
    color?: string
    nft_image_url?: string
  }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const loadSeatCategories = useCallback(async () => {
    if (!eventId) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('seat_categories')
        .select('id, name, price, capacity, sold, color, nft_image_url')
        .eq('event_id', eventId)

      if (error) throw error

      setSeatCategories(data || [])
      setError(null)
    } catch (err) {
      console.error('Error loading seat categories:', err)
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [eventId])

  useEffect(() => {
    loadSeatCategories()

    // Subscribe to changes for seat categories of this event
    const subscription = supabase
      .channel(`seat_categories_event_${eventId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'seat_categories',
          filter: `event_id=eq.${eventId}`
        },
        (payload) => {
          console.log('Seat category change received:', payload)
          const updatedCategory = payload.new as any
          
          setSeatCategories(prev => prev.map(cat => 
            cat.id === updatedCategory.id ? updatedCategory : cat
          ))
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [loadSeatCategories, eventId])

  return { seatCategories, loading, error, refetch: loadSeatCategories }
}

// ================================
// REAL-TIME NOTIFICATIONS HOOK
// ================================

export const useRealtimeNotifications = (userId?: string) => {
  const [notifications, setNotifications] = useState<Array<{
    id: string
    type: 'ticket_purchased' | 'event_reminder' | 'price_alert' | 'transfer_received'
    title: string
    message: string
    created_at: string
    read: boolean
  }>>([])

  useEffect(() => {
    if (!userId) return

    // Subscribe to user-specific real-time events that should trigger notifications
    const subscription = supabase
      .channel(`notifications_user_${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tickets',
          filter: `owner_id=eq.${userId}`
        },
        (payload) => {
          const newTicket = payload.new as Ticket
          setNotifications(prev => [{
            id: `ticket_${newTicket.id}`,
            type: 'ticket_purchased',
            title: 'Ticket Purchased!',
            message: 'Your NFT ticket has been created successfully.',
            created_at: new Date().toISOString(),
            read: false
          }, ...prev])
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tickets',
          filter: `owner_id=eq.${userId}`
        },
        (payload) => {
          const updatedTicket = payload.new as Ticket
          const oldTicket = payload.old as Ticket
          
          // Check if ownership changed (ticket transferred to this user)
          if (oldTicket.owner_id !== userId && updatedTicket.owner_id === userId) {
            setNotifications(prev => [{
              id: `transfer_${updatedTicket.id}`,
              type: 'transfer_received',
              title: 'Ticket Transferred',
              message: 'You have received a ticket transfer.',
              created_at: new Date().toISOString(),
              read: false
            }, ...prev])
          }
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [userId])

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => prev.map(notif => 
      notif.id === notificationId ? { ...notif, read: true } : notif
    ))
  }

  const clearAll = () => {
    setNotifications([])
  }

  const unreadCount = notifications.filter(n => !n.read).length

  return { 
    notifications, 
    unreadCount, 
    markAsRead, 
    clearAll 
  }
}