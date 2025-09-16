'use client';

import { useEffect } from 'react';

export default function RedirectInterceptor() {
  useEffect(() => {
    // Intercept ALL redirects to localhost and force production
    const originalReplace = window.location.replace;
    const originalAssign = window.location.assign;
    
    // Override window.location.replace
    window.location.replace = function(url: string | URL) {
      const urlString = typeof url === 'string' ? url : url.toString();
      
      if (urlString.includes('localhost:3000') || urlString.includes('127.0.0.1:3000')) {
        const productionUrl = urlString.replace(/localhost:3000|127\.0\.0\.1:3000/g, 'signalsloop.vercel.app');
        console.log('🔄 Intercepted localhost redirect:', urlString);
        console.log('🔄 Redirecting to production:', productionUrl);
        return originalReplace.call(this, productionUrl);
      }
      
      return originalReplace.call(this, url);
    };
    
    // Override window.location.assign
    window.location.assign = function(url: string | URL) {
      const urlString = typeof url === 'string' ? url : url.toString();
      
      if (urlString.includes('localhost:3000') || urlString.includes('127.0.0.1:3000')) {
        const productionUrl = urlString.replace(/localhost:3000|127\.0\.0\.1:3000/g, 'signalsloop.vercel.app');
        console.log('🔄 Intercepted localhost assign:', urlString);
        console.log('🔄 Assigning to production:', productionUrl);
        return originalAssign.call(this, productionUrl);
      }
      
      return originalAssign.call(this, url);
    };
    
    // Also intercept direct href assignments
    const originalHrefDescriptor = Object.getOwnPropertyDescriptor(window.location, 'href') || 
                                  Object.getOwnPropertyDescriptor(Location.prototype, 'href');
    
    if (originalHrefDescriptor) {
      Object.defineProperty(window.location, 'href', {
        get: originalHrefDescriptor.get,
        set: function(url: string) {
          if (url.includes('localhost:3000') || url.includes('127.0.0.1:3000')) {
            const productionUrl = url.replace(/localhost:3000|127\.0\.0\.1:3000/g, 'signalsloop.vercel.app');
            console.log('🔄 Intercepted localhost href assignment:', url);
            console.log('🔄 Setting href to production:', productionUrl);
            return originalHrefDescriptor.set?.call(this, productionUrl);
          }
          return originalHrefDescriptor.set?.call(this, url);
        },
        configurable: true
      });
    }
    
    console.log('🛡️ Redirect interceptor activated - all localhost redirects will be forced to production');
    
    return () => {
      // Restore original methods on cleanup
      window.location.replace = originalReplace;
      window.location.assign = originalAssign;
    };
  }, []);

  return null;
}
