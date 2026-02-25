import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login', '/register'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  // Kiểm tra cookie "sid" — cookie này giờ được set trên localhost
  // nhờ Next.js rewrites proxy (request qua /* là same-origin)
  const sid = request.cookies.get('sid')?.value;
  const isLoggedIn = !!sid && sid !== 'Guest';

  if (!isLoggedIn && !isPublic) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  if (isLoggedIn && isPublic) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
