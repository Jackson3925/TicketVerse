import { useState, useEffect, useContext, createContext, ReactNode } from 'react'
import { auth, type AuthUser } from '@/lib/auth'
import type { Session } from '@supabase/supabase-js'

// ================================
// AUTH CONTEXT
// ================================

interface AuthContextType {
  user: AuthUser | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, displayName?: string, userRole?: string) => Promise<void>
  signOut: () => Promise<void>
  updateProfile: (updates: any) => Promise<void>
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// ================================
// AUTH PROVIDER COMPONENT
// ================================

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const currentSession = await auth.getCurrentSession()
        const currentUser = await auth.getCurrentUser()
        
        setSession(currentSession)
        setUser(currentUser)
      } catch (error) {
        console.error('Error getting initial session:', error)
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { unsubscribe } = auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.id)
      
      setSession(session)
      
      if (session?.user) {
        const userWithProfile = await auth.getCurrentUser()
        setUser(userWithProfile)
      } else {
        setUser(null)
      }
      
      setLoading(false)
    })

    return () => {
      unsubscribe.unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    setLoading(true)
    try {
      const { user: signedInUser, error } = await auth.signIn({ email, password })
      
      if (error) {
        throw error
      }
      
      setUser(signedInUser)
    } catch (error) {
      console.error('Sign in error:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const signUp = async (email: string, password: string, displayName?: string, userRole?: string) => {
    setLoading(true)
    try {
      const { user: newUser, error } = await auth.signUp({ 
        email, 
        password, 
        displayName,
        userRole 
      })
      
      if (error) {
        throw error
      }
      
      setUser(newUser)
    } catch (error) {
      console.error('Sign up error:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    setLoading(true)
    try {
      const { error } = await auth.signOut()
      
      if (error) {
        throw error
      }
      
      setUser(null)
      setSession(null)
    } catch (error) {
      console.error('Sign out error:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const updateProfile = async (updates: any) => {
    if (!user) {
      throw new Error('No user authenticated')
    }

    try {
      const { profile, error } = await auth.updateProfile(updates)
      
      if (error) {
        throw error
      }
      
      // Update user state with new profile
      setUser(prev => prev ? { ...prev, profile } : null)
    } catch (error) {
      console.error('Update profile error:', error)
      throw error
    }
  }

  const value: AuthContextType = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
    isAuthenticated: !!user
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// ================================
// USE AUTH HOOK
// ================================

export const useAuth = () => {
  const context = useContext(AuthContext)
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  
  return context
}

// ================================
// ADDITIONAL AUTH HOOKS
// ================================

// Hook for checking if user has specific permissions
export const usePermissions = () => {
  const { user } = useAuth()

  const canCreateEvents = () => {
    // Add your permission logic here
    return !!user // For now, any authenticated user can create events
  }

  const canManageEvent = (eventSellerId: string) => {
    return user?.id === eventSellerId
  }

  const canTransferTicket = (ticketOwnerId: string) => {
    return user?.id === ticketOwnerId
  }

  const canViewSellerDashboard = () => {
    // Check if user has created any events or has seller role
    return !!user // Simplified for now
  }

  return {
    canCreateEvents,
    canManageEvent,
    canTransferTicket,
    canViewSellerDashboard
  }
}

// Hook for auth form state management
export const useAuthForm = () => {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { signIn, signUp } = useAuth()

  const validateForm = () => {
    if (!email || !password) {
      setError('Email and password are required')
      return false
    }

    if (isSignUp && password !== confirmPassword) {
      setError('Passwords do not match')
      return false
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long')
      return false
    }

    setError(null)
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setIsLoading(true)
    setError(null)

    try {
      if (isSignUp) {
        await signUp(email, password, displayName)
      } else {
        await signIn(email, password)
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setEmail('')
    setPassword('')
    setDisplayName('')
    setConfirmPassword('')
    setError(null)
    setIsLoading(false)
  }

  const toggleMode = () => {
    setIsSignUp(!isSignUp)
    setError(null)
  }

  return {
    isSignUp,
    email,
    setEmail,
    password,
    setPassword,
    displayName,
    setDisplayName,
    confirmPassword,
    setConfirmPassword,
    isLoading,
    error,
    handleSubmit,
    resetForm,
    toggleMode
  }
}

// Hook for protected routes
export const useRequireAuth = (redirectTo = '/auth') => {
  const { user, loading } = useAuth()
  const [shouldRedirect, setShouldRedirect] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      setShouldRedirect(true)
    } else {
      setShouldRedirect(false)
    }
  }, [user, loading])

  return {
    user,
    loading,
    shouldRedirect,
    redirectTo
  }
}

// Hook for profile completion check
export const useProfileCompletion = () => {
  const { user } = useAuth()

  const isProfileComplete = () => {
    if (!user?.profile) return false
    
    const profile = user.profile
    return !!(
      profile.display_name &&
      profile.email
    )
  }

  const getMissingFields = () => {
    if (!user?.profile) return ['display_name', 'email']
    
    const missing: string[] = []
    const profile = user.profile
    
    if (!profile.display_name) missing.push('display_name')
    if (!profile.email) missing.push('email')
    
    return missing
  }

  const getCompletionPercentage = () => {
    if (!user?.profile) return 0
    
    const profile = user.profile
    const totalFields = 5 // Adjust based on your required fields
    let completedFields = 0
    
    if (profile.display_name) completedFields++
    if (profile.email) completedFields++
    if (profile.bio) completedFields++
    if (profile.location) completedFields++
    if (profile.avatar_url) completedFields++
    
    return Math.round((completedFields / totalFields) * 100)
  }

  return {
    isComplete: isProfileComplete(),
    missingFields: getMissingFields(),
    completionPercentage: getCompletionPercentage()
  }
}

export default useAuth