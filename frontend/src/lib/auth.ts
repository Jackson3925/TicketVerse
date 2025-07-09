import { supabase } from './supabase'
import { usersAPI, buyersAPI, sellersAPI } from './api'
import type { User, Session, AuthError } from '@supabase/supabase-js'
import type { User as AppUser, BuyerProfile, SellerProfile } from './supabase'

export interface AuthUser extends User {
  userProfile?: AppUser
  buyerProfile?: BuyerProfile
  sellerProfile?: SellerProfile
}

export interface AuthResponse {
  user: AuthUser | null
  session: Session | null
  error?: AuthError
}

export interface SignUpData {
  email: string
  password: string
  displayName?: string
  userRole?: string
  redirectTo?: string
}

export interface SignInData {
  email: string
  password: string
}

export interface ResetPasswordData {
  email: string
  redirectTo?: string
}

export interface UpdatePasswordData {
  password: string
}

export interface UpdateUserData {
  display_name?: string
  avatar_url?: string
}

export interface UpdateBuyerData {
  bio?: string
  location?: string
  wallet_address?: string
  wallet_balance?: number
  wallet_verified?: boolean
  notification_event_reminders?: boolean
  notification_ticket_updates?: boolean
  notification_price_alerts?: boolean
  notification_marketing_emails?: boolean
  preferred_genres?: string[]
}

export interface UpdateSellerData {
  business_name?: string
  business_type?: 'individual' | 'company' | 'venue'
  bio?: string
  location?: string
  contact_phone?: string
  wallet_address?: string
  wallet_balance?: number
  wallet_verified?: boolean
  notification_new_orders?: boolean
  notification_customer_messages?: boolean
  notification_payout_updates?: boolean
  notification_marketing_emails?: boolean
}

// ================================
// AUTHENTICATION SERVICE
// ================================

export const auth = {
  // Sign up with email and password
  async signUp({ email, password, displayName, userRole, redirectTo }: SignUpData): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectTo,
          data: {
            display_name: displayName,
            user_role: userRole || 'buyer'
          }
        }
      })

      if (error) {
        console.error('Sign up error:', error)
        return { user: null, session: null, error }
      }

      // Create user profile if user was created successfully
      if (data.user) {
        try {
          // Map role names ('customer' -> 'buyer')
          const mappedRole: 'buyer' | 'seller' = userRole === 'customer' ? 'buyer' : 
                            userRole === 'seller' ? 'seller' : 'buyer'
          
          // Use database function to create profile (bypasses RLS)
          const { error: profileError } = await supabase.rpc('create_user_profile', {
            user_id: data.user.id,
            user_email: email,
            display_name: displayName || '',
            user_type: mappedRole
          })

          if (profileError) {
            throw profileError
          }

          console.log('Profile created successfully for user:', data.user.id)
        } catch (profileError) {
          console.error('Error creating profile:', profileError)
          console.error('Profile creation error details:', {
            error: profileError,
            errorMessage: (profileError as any)?.message,
            errorCode: (profileError as any)?.code,
            errorDetails: (profileError as any)?.details,
            userId: data.user.id,
            email,
            displayName,
            userRole,
            mappedRole,
            timestamp: new Date().toISOString()
          })
          
          // Log additional context for debugging
          console.error('Supabase auth user data:', {
            userId: data.user.id,
            userEmail: data.user.email,
            userConfirmed: data.user.email_confirmed_at,
            userCreated: data.user.created_at,
            sessionExists: !!data.session
          })
          
          // Don't fail signup if profile creation fails
        }
      }

      return { 
        user: data.user as AuthUser, 
        session: data.session 
      }
    } catch (error) {
      console.error('Unexpected sign up error:', error)
      return { 
        user: null, 
        session: null, 
        error: error as AuthError 
      }
    }
  },

  // Sign in with email and password
  async signIn({ email, password }: SignInData): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        console.error('Sign in error:', error)
        return { user: null, session: null, error }
      }

      // Load user profiles
      let userWithProfile = data.user as AuthUser
      if (data.user) {
        try {
          const userProfile = await usersAPI.getUser(data.user.id)
          userWithProfile.userProfile = userProfile || undefined
          
          if (userProfile?.user_type === 'buyer') {
            const buyerProfile = await buyersAPI.getBuyer(data.user.id)
            if (buyerProfile && userProfile) {
              userWithProfile.buyerProfile = { ...userProfile, ...buyerProfile }
            }
          } else if (userProfile?.user_type === 'seller') {
            const sellerProfile = await sellersAPI.getSeller(data.user.id)
            if (sellerProfile && userProfile) {
              userWithProfile.sellerProfile = { ...userProfile, ...sellerProfile }
            }
          }
        } catch (profileError) {
          console.error('Error loading profile:', profileError)
        }
      }

      return { 
        user: userWithProfile, 
        session: data.session 
      }
    } catch (error) {
      console.error('Unexpected sign in error:', error)
      return { 
        user: null, 
        session: null, 
        error: error as AuthError 
      }
    }
  },

  // Sign in with Google OAuth
  async signInWithGoogle(redirectTo?: string): Promise<{ error?: AuthError }> {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectTo || `${window.location.origin}/auth/callback`
        }
      })

      if (error) {
        console.error('Google sign in error:', error)
        return { error }
      }

      return {}
    } catch (error) {
      console.error('Unexpected Google sign in error:', error)
      return { error: error as AuthError }
    }
  },

  // Sign out
  async signOut(): Promise<{ error?: AuthError }> {
    try {
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error('Sign out error:', error)
        return { error }
      }

      return {}
    } catch (error) {
      console.error('Unexpected sign out error:', error)
      return { error: error as AuthError }
    }
  },

  // Get current user
  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error || !user) {
        return null
      }

      // Load profiles
      let userWithProfile = user as AuthUser
      try {
        const userProfile = await usersAPI.getUser(user.id)
        userWithProfile.userProfile = userProfile || undefined
        
        if (userProfile?.user_type === 'buyer') {
          const buyerProfile = await buyersAPI.getBuyer(user.id)
          if (buyerProfile && userProfile) {
            userWithProfile.buyerProfile = { ...userProfile, ...buyerProfile }
          }
        } else if (userProfile?.user_type === 'seller') {
          const sellerProfile = await sellersAPI.getSeller(user.id)
          if (sellerProfile && userProfile) {
            userWithProfile.sellerProfile = { ...userProfile, ...sellerProfile }
          }
        }
      } catch (profileError) {
        console.error('Error loading profile:', profileError)
      }

      return userWithProfile
    } catch (error) {
      console.error('Error getting current user:', error)
      return null
    }
  },

  // Get current session
  async getCurrentSession(): Promise<Session | null> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('Error getting session:', error)
        return null
      }

      return session
    } catch (error) {
      console.error('Unexpected error getting session:', error)
      return null
    }
  },

  // Reset password
  async resetPassword({ email, redirectTo }: ResetPasswordData): Promise<{ error?: AuthError }> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectTo || `${window.location.origin}/auth/reset-password`
      })

      if (error) {
        console.error('Reset password error:', error)
        return { error }
      }

      return {}
    } catch (error) {
      console.error('Unexpected reset password error:', error)
      return { error: error as AuthError }
    }
  },

  // Update password
  async updatePassword({ password }: UpdatePasswordData): Promise<{ error?: AuthError }> {
    try {
      const { error } = await supabase.auth.updateUser({
        password
      })

      if (error) {
        console.error('Update password error:', error)
        return { error }
      }

      return {}
    } catch (error) {
      console.error('Unexpected update password error:', error)
      return { error: error as AuthError }
    }
  },

  // Update user email
  async updateEmail(email: string): Promise<{ error?: AuthError }> {
    try {
      const { error } = await supabase.auth.updateUser({
        email
      })

      if (error) {
        console.error('Update email error:', error)
        return { error }
      }

      return {}
    } catch (error) {
      console.error('Unexpected update email error:', error)
      return { error: error as AuthError }
    }
  },

  // Update user profile
  async updateUser(updates: UpdateUserData): Promise<{ user?: AppUser; error?: Error }> {
    try {
      const user = await this.getCurrentUser()
      
      if (!user) {
        return { error: new Error('User not authenticated') }
      }

      const userProfile = await usersAPI.updateUser(user.id, updates)
      
      return { user: userProfile }
    } catch (error) {
      console.error('Update user error:', error)
      return { error: error as Error }
    }
  },

  // Update buyer profile  
  async updateBuyer(updates: UpdateBuyerData): Promise<{ buyer?: BuyerProfile; error?: Error }> {
    try {
      const user = await this.getCurrentUser()
      
      if (!user || user.userProfile?.user_type !== 'buyer') {
        return { error: new Error('User not authenticated as buyer') }
      }

      const buyerProfile = await buyersAPI.updateBuyer(user.id, updates)
      
      if (buyerProfile && user.userProfile) {
        return { buyer: { ...user.userProfile, ...buyerProfile } }
      }
      
      return { error: new Error('Failed to update buyer profile') }
    } catch (error) {
      console.error('Update buyer error:', error)
      return { error: error as Error }
    }
  },

  // Update seller profile
  async updateSeller(updates: UpdateSellerData): Promise<{ seller?: SellerProfile; error?: Error }> {
    try {
      const user = await this.getCurrentUser()
      
      if (!user || user.userProfile?.user_type !== 'seller') {
        return { error: new Error('User not authenticated as seller') }
      }

      const sellerProfile = await sellersAPI.updateSeller(user.id, updates)
      
      if (sellerProfile && user.userProfile) {
        return { seller: { ...user.userProfile, ...sellerProfile } }
      }
      
      return { error: new Error('Failed to update seller profile') }
    } catch (error) {
      console.error('Update seller error:', error)
      return { error: error as Error }
    }
  },

  // Refresh session
  async refreshSession(): Promise<{ session?: Session; error?: AuthError }> {
    try {
      const { data, error } = await supabase.auth.refreshSession()

      if (error) {
        console.error('Refresh session error:', error)
        return { error }
      }

      return { session: data.session }
    } catch (error) {
      console.error('Unexpected refresh session error:', error)
      return { error: error as AuthError }
    }
  },

  // Listen to auth state changes
  onAuthStateChange(callback: (event: string, session: Session | null) => void) {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        try {
          callback(event, session)
        } catch (error) {
          console.error('Auth state change callback error:', error)
        }
      }
    )

    return subscription
  },

  // Check if user is authenticated
  isAuthenticated(): Promise<boolean> {
    return this.getCurrentUser().then(user => !!user)
  },

  // Check if user has specific role
  async hasRole(role: 'buyer' | 'seller'): Promise<boolean> {
    try {
      const user = await this.getCurrentUser()
      
      if (!user?.userProfile) {
        return false
      }

      return user.userProfile.user_type === role
    } catch (error) {
      console.error('Error checking user role:', error)
      return false
    }
  },

  // Verify email
  async verifyEmail(token: string, type: 'email' | 'recovery' = 'email'): Promise<{ error?: AuthError }> {
    try {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: type === 'email' ? 'email' : 'recovery'
      })

      if (error) {
        console.error('Email verification error:', error)
        return { error }
      }

      return {}
    } catch (error) {
      console.error('Unexpected email verification error:', error)
      return { error: error as AuthError }
    }
  }
}

// ================================
// AUTH UTILITIES
// ================================

export const authUtils = {
  // Format auth error messages for display
  formatErrorMessage(error: AuthError): string {
    switch (error.message) {
      case 'Invalid login credentials':
        return 'Invalid email or password. Please try again.'
      case 'Email not confirmed':
        return 'Please check your email and click the confirmation link.'
      case 'User already registered':
        return 'An account with this email already exists.'
      case 'Password should be at least 6 characters':
        return 'Password must be at least 6 characters long.'
      case 'Unable to validate email address: invalid format':
        return 'Please enter a valid email address.'
      case 'Signup is disabled':
        return 'Account registration is currently disabled.'
      case 'Email rate limit exceeded':
        return 'Too many emails sent. Please wait before trying again.'
      default:
        return error.message || 'An unexpected error occurred.'
    }
  },

  // Validate email format
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  },

  // Validate password strength
  validatePassword(password: string): {
    isValid: boolean
    errors: string[]
  } {
    const errors: string[] = []
    
    if (password.length < 6) {
      errors.push('Password must be at least 6 characters long')
    }
    
    if (password.length > 128) {
      errors.push('Password must be less than 128 characters')
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter')
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter')
    }
    
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  },

  // Generate avatar URL from email (using Gravatar)
  getAvatarUrl(email: string, size = 200): string {
    // Simple hash function for demo - in production use proper hashing
    const hash = btoa(email.toLowerCase().trim()).slice(0, 32)
    return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=identicon`
  },

  // Check if user profile is complete
  isUserProfileComplete(user: AppUser): boolean {
    return !!(
      user.display_name &&
      user.email
    )
  },

  // Check if buyer profile is complete
  isBuyerProfileComplete(buyer: BuyerProfile): boolean {
    return !!(
      buyer.display_name &&
      buyer.email &&
      buyer.location
    )
  },

  // Check if seller profile is complete
  isSellerProfileComplete(seller: SellerProfile): boolean {
    return !!(
      seller.display_name &&
      seller.email &&
      seller.business_name &&
      seller.business_type &&
      seller.location
    )
  },

  // Get user initials for avatar fallback
  getUserInitials(user?: AppUser | BuyerProfile | SellerProfile): string {
    if (!user?.display_name) {
      return user?.email?.slice(0, 2).toUpperCase() || 'U'
    }
    
    const names = user.display_name.split(' ')
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase()
    }
    
    return user.display_name.slice(0, 2).toUpperCase()
  }
}

// Export auth instance as default
export default auth