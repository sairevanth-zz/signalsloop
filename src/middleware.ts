import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // Refresh the session
  await supabase.auth.getSession()

  // Try both getSession and getUser for compatibility
  const [
    { data: { session } },
    { data: { user: userFromGetUser } }
  ] = await Promise.all([
    supabase.auth.getSession(),
    supabase.auth.getUser()
  ])
  
  const user = session?.user || userFromGetUser

  // Debug logging for middleware
  console.log('🔍 Middleware Debug:', {
    pathname: request.nextUrl.pathname,
    hasSession: !!session,
    hasUserFromSession: !!session?.user,
    hasUserFromGetUser: !!userFromGetUser,
    finalUser: !!user,
    userEmail: user?.email
  })

  // Protected routes that require authentication
  const protectedRoutes = ['/app', '/app/create', '/billing']
  const authRoutes = ['/login', '/auth/callback']
  const isProtectedRoute = protectedRoutes.some(route => 
    request.nextUrl.pathname.startsWith(route)
  )
  const isAuthRoute = authRoutes.some(route => 
    request.nextUrl.pathname.startsWith(route)
  )

  // Redirect unauthenticated users from protected routes
  if (isProtectedRoute && !user) {
    console.log('❌ Redirecting to login - no user found')
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('redirectTo', request.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Redirect authenticated users away from login page only
  if (user && request.nextUrl.pathname === '/login') {
    return NextResponse.redirect(new URL('/app', request.url))
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
