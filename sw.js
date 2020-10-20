// SW Version
const version = '1.2';

// Static Cache - App Shell
const appAssets = [
    'index.html',
    'main.js',
    'images/flame.png',
    'images/logo.png',
    'images/sync.png',
    'vendor/bootstrap.min.css',
    'vendor/jquery.min.js'
];


// SW Install
self.addEventListener( 'install', e => {
    e.waitUntil(
        caches.open( `static-${version}` )
            .then( cache => cache.addAll(appAssets) )
    );
});

// SW Activate
self.addEventListener( 'activate', e => {

    // Clean static cache
    let cleaned = caches.keys().then( keys => {
        keys.forEach( key => {
            if ( key !== `static-${version}` && key.match('static-') ) {
                return caches.delete(key);
            }
        });
    });
    e.waitUntil(cleaned);
});


// Static cache startegy - Cache with Network Fallback
const staticCache = ( req, cacheName = `static-${version}` ) => {

    return caches.match(req).then( cachedRes => {

        // Return cached response if found
        if(cachedRes) return cachedRes;

        // Fall back to network
        return fetch(req).then ( networkRes => {

            // Update cache with new response
            caches.open(cacheName)
                .then( cache => cache.put( req, networkRes ));

            // Return Clone of Network Response
            return networkRes.clone();
        });
    });
};

// Network with Cache Fallback
const fallbackCache = (req) => {

    // Try Network
    return fetch(req).then( networkRes => {

        // Check res is OK, else go to cache
        if( !networkRes.ok ) throw 'Fetch Error';

        // Update cache
        caches.open( `static-${version}` )
            .then( cache => cache.put( req, networkRes ) );

        // Return Clone of Network Response
        return networkRes.clone();
    })
    
    // Try cache
    .catch( err => caches.match(req) );
};


// Clean old Giphys from the 'giphy' cache
const cleanGiphyCache = (giphys) => {

    caches.open('giphy').then( cache => {

        // Get all cache entries
        cache.keys().then( keys => {

            // Loop entries (requests)
            keys.forEach( key => {

                // If entry is NOT part of current Giphys, Delete
                if( !giphys.includes(key.url) ) cache.delete(key);
            });
        });
    });
};

// SW Fetch
self.addEventListener('fetch', e => {

    // App shell
    if( e.request.url.match(location.origin) ) {
        e.respondWith( staticCache(e.request) );
    
    // Giphy API
    } else if ( e.request.url.match('api.giphy.com/v1/gifs/trending') ) {
        e.respondWith( fallbackCache(e.request) );
    
    // Giphy Media
    } else if ( e.request.url.match('giphy.com/media') ) {
        e.respondWith( staticCache(e.request, 'giphy') );
    }
});

// Listen for message from client
self.addEventListener('message', e => {

    // Identify the message
    if( e.data.action === 'cleanGiphyCache' ) cleanGiphyCache(e.data.giphys);
});
