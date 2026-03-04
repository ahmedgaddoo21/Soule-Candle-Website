// Database Functions
function initDB() {
    // Always fetch fresh data from data.json
    fetch('data.json')
        .then(res => {
            if (!res.ok) throw new Error('Failed to load data.json');
            return res.json();
        })
        .then(data => {
            // Preserve existing users but update products
            const existing = getDB();
            if (existing && existing.users && existing.users.length > 0) {
                data.users = existing.users;
            }
            localStorage.setItem('wickglow_db', JSON.stringify(data));
            console.log('Database loaded from data.json');
            
            // Dispatch event to notify pages that data is ready
            window.dispatchEvent(new CustomEvent('dbReady'));
        })
        .catch(err => {
            console.error('Failed to load data.json:', err);
            // Only use default if nothing exists
            if (!localStorage.getItem('wickglow_db')) {
                const defaultDB = { 
                    users: [], 
                    products: [
                        {
                            "id": 1,
                            "title": "Midnight Amber",
                            "author": "Lumina Atelier",
                            "price": 34.99,
                            "category": "scented",
                            "genre": "Warm & Spicy",
                            "image": "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='450'%3E%3Crect fill='%2378350f' width='300' height='450'/%3E%3Ctext x='50%25' y='50%25' font-size='20' fill='white' text-anchor='middle' dy='.3em'%3EMidnight%3C/text%3E%3C/svg%3E",
                            "rating": 4.9,
                            "pages": 45,
                            "description": "Rich amber resin blended with vanilla orchid and sandalwood.",
                            "publisher": "Lumina Atelier",
                            "year": 2024
                        }
                    ]
                };
                localStorage.setItem('wickglow_db', JSON.stringify(defaultDB));
            }
            window.dispatchEvent(new CustomEvent('dbReady'));
        });
}

function getDB() {
    const data = localStorage.getItem('wickglow_db');
    return data ? JSON.parse(data) : { users: [], products: [] };
}

function saveDB(db) {
    localStorage.setItem('wickglow_db', JSON.stringify(db));
}

// Force refresh from data.json
function refreshDB() {
    localStorage.removeItem('wickglow_db');
    initDB();
    setTimeout(() => location.reload(), 500);
}

// User Functions
function isLoggedIn() {
    return localStorage.getItem('wickglow_session') !== null;
}

function getCurrentUser() {
    const session = localStorage.getItem('wickglow_session');
    return session ? JSON.parse(session) : null;
}

function loginUser(email, password) {
    const db = getDB();
    const user = db.users.find(u => u.email === email && u.password === password);
    if (user) {
        localStorage.setItem('wickglow_session', JSON.stringify(user));
        return { success: true, user };
    }
    return { success: false, message: 'Invalid email or password' };
}

function registerUser(name, email, password, phone = '', address = '') {
    const db = getDB();
    if (db.users.find(u => u.email === email)) {
        return { success: false, message: 'Email already registered' };
    }
    const newUser = {
        id: Date.now(),
        name,
        email,
        password,
        phone,
        address,
        avatar: null,
        orders: []
    };
    db.users.push(newUser);
    saveDB(db);
    localStorage.setItem('wickglow_session', JSON.stringify(newUser));
    return { success: true, user: newUser };
}

function logoutUser() {
    localStorage.removeItem('wickglow_session');
}

function updateUser(updates) {
    const db = getDB();
    const session = getCurrentUser();
    if (!session) return false;
    const userIndex = db.users.findIndex(u => u.id === session.id);
    if (userIndex === -1) return false;
    db.users[userIndex] = { ...db.users[userIndex], ...updates };
    saveDB(db);
    localStorage.setItem('wickglow_session', JSON.stringify(db.users[userIndex]));
    return true;
}

// Cart Functions
function getCart() {
    return JSON.parse(localStorage.getItem('wickglow_cart')) || [];
}

function saveCart(cart) {
    localStorage.setItem('wickglow_cart', JSON.stringify(cart));
    updateCartCount();
}

function addToCart(product) {
    let cart = getCart();
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
        existing.qty++;
    } else {
        cart.push({ ...product, qty: 1 });
    }
    saveCart(cart);
    showToast(`Added "${product.title}" to cart`);
    return cart;
}

function removeFromCart(productId) {
    let cart = getCart().filter(item => item.id !== productId);
    saveCart(cart);
    return cart;
}

function updateCartQty(productId, change) {
    let cart = getCart();
    const item = cart.find(i => i.id === productId);
    if (item) {
        item.qty += change;
        if (item.qty <= 0) {
            cart = cart.filter(i => i.id !== productId);
        }
        saveCart(cart);
    }
    return cart;
}

function clearCart() {
    localStorage.removeItem('wickglow_cart');
    updateCartCount();
}

function getCartTotal() {
    return getCart().reduce((sum, item) => sum + (item.price * item.qty), 0);
}

function applyPromoCode(code) {
    const promos = {
        'GLOW10': 0.10,
        'CANDLE20': 0.20,
        'WICK5': 0.05
    };
    return promos[code.toUpperCase()] || null;
}

// Wishlist Functions
function getWishlist() {
    return JSON.parse(localStorage.getItem('wickglow_wishlist')) || [];
}

function saveWishlist(list) {
    localStorage.setItem('wickglow_wishlist', JSON.stringify(list));
    updateWishlistCount();
}

function toggleWishlist(productId) {
    let list = getWishlist();
    const index = list.indexOf(productId);
    const db = getDB();
    const product = db.products.find(p => p.id === productId);
    
    if (index === -1) {
        list.push(productId);
        showToast(product ? `Added "${product.title}" to wishlist` : 'Added to wishlist');
    } else {
        list.splice(index, 1);
        showToast(product ? `Removed "${product.title}" from wishlist` : 'Removed from wishlist');
    }
    saveWishlist(list);
    return list;
}

function isInWishlist(productId) {
    return getWishlist().includes(productId);
}

// UI Update Functions
function updateCartCount() {
    const cart = getCart();
    const count = cart.reduce((sum, item) => sum + item.qty, 0);
    document.querySelectorAll('.cart-count').forEach(el => {
        el.textContent = count;
        el.classList.toggle('hidden', count === 0);
    });
}

function updateWishlistCount() {
    const count = getWishlist().length;
    document.querySelectorAll('.wishlist-count').forEach(el => {
        el.textContent = count;
        el.classList.toggle('hidden', count === 0);
    });
}

function updateNavCounts() {
    updateCartCount();
    updateWishlistCount();
}

function requireAuth() {
    if (!isLoggedIn()) {
        window.location.href = 'auth.html?redirect=' + encodeURIComponent(window.location.pathname);
        return false;
    }
    return true;
}

// Dark Mode Functions
function initDarkMode() {
    const isDark = localStorage.getItem('wickglow_dark') === 'true';
    if (isDark) document.documentElement.classList.add('dark');
}

function toggleDarkMode() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('wickglow_dark', isDark);
}

// Toast Notification
function showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'fixed bottom-6 right-6 z-[70] flex flex-col gap-2 pointer-events-none';
        document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    const bgColor = type === 'error' ? 'bg-red-500' : 'bg-amber-800';
    
    toast.className = `${bgColor} text-white px-6 py-3 rounded-lg shadow-lg transform translate-y-10 opacity-0 transition-all duration-300 flex items-center gap-2 pointer-events-auto`;
    toast.innerHTML = `<i class="ph-fill ${type === 'error' ? 'ph-warning' : 'ph-check-circle'}"></i><span>${message}</span>`;
    
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.remove('translate-y-10', 'opacity-0'));
    
    setTimeout(() => {
        toast.classList.add('translate-y-10', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Wishlist Drawer Functions
function openWishlistDrawer() {
    const drawer = document.getElementById('wishlist-drawer');
    const panel = document.getElementById('wishlist-panel');
    if (drawer && panel) {
        drawer.classList.remove('hidden');
        setTimeout(() => panel.classList.remove('translate-x-full'), 10);
        renderWishlistDrawer();
    }
}

function closeWishlistDrawer() {
    const drawer = document.getElementById('wishlist-drawer');
    const panel = document.getElementById('wishlist-panel');
    if (panel && drawer) {
        panel.classList.add('translate-x-full');
        setTimeout(() => drawer.classList.add('hidden'), 300);
    }
}

function toggleWishlistDrawer() {
    const drawer = document.getElementById('wishlist-drawer');
    if (drawer && drawer.classList.contains('hidden')) {
        openWishlistDrawer();
    } else {
        closeWishlistDrawer();
    }
}

function renderWishlistDrawer() {
    const container = document.getElementById('wishlist-items');
    const list = getWishlist();
    const db = getDB();
    const wishlistProducts = db.products.filter(p => list.includes(p.id));
    
    if (!container) return;
    
    if (wishlistProducts.length === 0) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full text-amber-400 dark:text-amber-600">
                <i class="ph ph-heart text-6xl mb-4 opacity-50"></i>
                <p class="dark:text-amber-300">Your wishlist is empty</p>
            </div>
        `;
        return;
    }

    container.innerHTML = wishlistProducts.map(item => `
        <div class="flex gap-4 animate-fade-in">
            <img src="${item.image}" class="w-20 h-28 object-cover rounded-lg bg-amber-100 dark:bg-neutral-700" alt="${item.title}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'80\' height=\'112\'%3E%3Crect fill=\'%23fcd34d\' width=\'80\' height=\'112\'/%3E%3C/svg%3E'">
            <div class="flex-1">
                <h3 class="font-serif font-bold text-lg dark:text-white line-clamp-2">${item.title}</h3>
                <p class="text-sm text-amber-600 dark:text-amber-400">${item.author}</p>
                <p class="font-medium dark:text-white mt-1">$${item.price.toFixed(2)}</p>
                <button onclick="addCandleToCartFromWishlist(${item.id})" class="mt-2 text-sm font-medium text-amber-800 dark:text-amber-400 hover:underline">Add to Cart</button>
            </div>
            <button onclick="removeWishlistItem(${item.id})" class="text-red-500 self-start">
                <i class="ph-fill ph-heart text-xl"></i>
            </button>
        </div>
    `).join('');
}

function removeWishlistItem(productId) {
    toggleWishlist(productId);
    renderWishlistDrawer();
    updateNavCounts();
}

function addCandleToCartFromWishlist(productId) {
    const db = getDB();
    const product = db.products.find(p => p.id === productId);
    if (product) {
        addToCart(product);
        updateNavCounts();
    }
}

// Navigation Component
function renderNav() {
    const cart = getCart();
    const wishlist = getWishlist();
    const cartCount = cart.reduce((a, b) => a + b.qty, 0);
    const wishlistCount = wishlist.length;
    
    return `
    <nav class="fixed w-full z-50 glass border-b border-amber-200/50 dark:border-neutral-800/50 transition-all duration-300 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between items-center h-20">
                <a href="index.html" class="flex-shrink-0 flex items-center group">
                    <div class="relative">
                        <i class="ph-fill ph-candle text-3xl text-amber-700 dark:text-amber-500 mr-2 transform group-hover:rotate-12 transition-transform duration-300"></i>
                        <div class="absolute -top-1 -right-1 w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                    </div>
                    <span class="font-serif text-2xl font-bold tracking-wide dark:text-white group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors">Soul Candles ✨</span>
                </a>

                <div class="hidden md:flex space-x-1 items-center">
                    <a href="index.html" class="nav-link px-4 py-2 text-sm font-medium text-amber-900 dark:text-amber-100 hover:text-amber-700 dark:hover:text-amber-400 transition-all relative group">
                        Home
                        <span class="absolute bottom-0 left-1/2 w-0 h-0.5 bg-amber-600 group-hover:w-full group-hover:left-0 transition-all duration-300"></span>
                    </a>
                    <a href="shop.html" class="nav-link px-4 py-2 text-sm font-medium text-amber-900 dark:text-amber-100 hover:text-amber-700 dark:hover:text-amber-400 transition-all relative group flex items-center gap-1">
                        Shop
                        <span class="px-1.5 py-0.5 text-[10px] bg-amber-600 text-white rounded-full font-bold">NEW</span>
                        <span class="absolute bottom-0 left-1/2 w-0 h-0.5 bg-amber-600 group-hover:w-full group-hover:left-0 transition-all duration-300"></span>
                    </a>
                    <a href="index.html#about" class="nav-link px-4 py-2 text-sm font-medium text-amber-900 dark:text-amber-100 hover:text-amber-700 dark:hover:text-amber-400 transition-all relative group">
                        About
                        <span class="absolute bottom-0 left-1/2 w-0 h-0.5 bg-amber-600 group-hover:w-full group-hover:left-0 transition-all duration-300"></span>
                    </a>
                    <a href="index.html#contact" class="nav-link px-4 py-2 text-sm font-medium text-amber-900 dark:text-amber-100 hover:text-amber-700 dark:hover:text-amber-400 transition-all relative group">
                        Contact
                        <span class="absolute bottom-0 left-1/2 w-0 h-0.5 bg-amber-600 group-hover:w-full group-hover:left-0 transition-all duration-300"></span>
                    </a>
                </div>

                <div class="hidden md:flex items-center space-x-2">
                    <a href="shop.html" class="p-2.5 rounded-full hover:bg-amber-100 dark:hover:bg-neutral-800 transition-all duration-300 hover:scale-110 group" title="Search candles">
                        <i class="ph ph-magnifying-glass text-xl text-amber-800 dark:text-amber-200 group-hover:text-amber-600"></i>
                    </a>
                    
                    <button onclick="toggleDarkMode()" class="p-2.5 rounded-full hover:bg-amber-100 dark:hover:bg-neutral-800 transition-all duration-300 hover:scale-110 hover:rotate-12">
                        <i class="ph ph-moon text-xl text-amber-800 dark:hidden"></i>
                        <i class="ph ph-sun text-xl hidden dark:block text-yellow-400 animate-pulse"></i>
                    </button>
                    
                    <button onclick="toggleWishlistDrawer()" class="p-2.5 rounded-full hover:bg-amber-100 dark:hover:bg-neutral-800 transition-all duration-300 hover:scale-110 relative group">
                        <i class="ph ph-heart text-xl text-amber-800 dark:text-amber-200 group-hover:text-red-500 transition-colors"></i>
                        <span class="wishlist-count absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full ${wishlistCount > 0 ? 'animate-bounce' : 'hidden'}">${wishlistCount}</span>
                    </button>
                    
                    <a href="cart.html" class="p-2.5 rounded-full hover:bg-amber-100 dark:hover:bg-neutral-800 transition-all duration-300 hover:scale-110 relative group">
                        <i class="ph ph-shopping-bag text-xl text-amber-800 dark:text-amber-200 group-hover:text-amber-600"></i>
                        <span class="cart-count absolute -top-1 -right-1 bg-amber-700 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full ${cartCount > 0 ? '' : 'hidden'}">${cartCount}</span>
                    </a>
                    
                    <a href="${isLoggedIn() ? 'profile.html' : 'auth.html'}" class="p-2.5 rounded-full hover:bg-amber-100 dark:hover:bg-neutral-800 transition-all duration-300 hover:scale-110 relative group">
                        <div class="relative">
                            <i class="ph ph-user text-xl text-amber-800 dark:text-amber-200"></i>
                            ${isLoggedIn() ? '<div class="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white dark:border-neutral-900"></div>' : ''}
                        </div>
                    </a>
                </div>

                <div class="md:hidden flex items-center space-x-3">
                    <a href="cart.html" class="p-2 relative">
                        <i class="ph ph-shopping-bag text-2xl text-amber-900 dark:text-white"></i>
                        <span class="cart-count absolute -top-1 -right-1 bg-amber-700 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full ${cartCount > 0 ? '' : 'hidden'}">${cartCount}</span>
                    </a>
                    <button onclick="document.getElementById('mobile-menu').classList.toggle('hidden'); document.getElementById('mobile-menu').classList.toggle('animate-fade-in')" class="p-2 text-amber-900 dark:text-white hover:bg-amber-100 dark:hover:bg-neutral-800 rounded-lg transition-colors">
                        <i class="ph ph-list text-2xl"></i>
                    </button>
                </div>
            </div>
        </div>

        <div id="mobile-menu" class="hidden md:hidden bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl border-t border-amber-200 dark:border-neutral-800 absolute w-full shadow-2xl">
            <div class="px-4 pt-4 pb-8 space-y-2">
                <div class="relative mb-4">
                    <i class="ph ph-magnifying-glass absolute left-3 top-1/2 transform -translate-y-1/2 text-amber-400"></i>
                    <input type="text" placeholder="Search candles..." onkeyup="if(event.key==='Enter') window.location.href='shop.html'" class="w-full pl-10 pr-4 py-3 rounded-xl bg-amber-50 dark:bg-neutral-800 border border-amber-200 dark:border-neutral-700 focus:outline-none focus:border-amber-500 dark:text-white">
                </div>
                
                <a href="index.html" class="flex items-center gap-3 px-4 py-3 text-base font-medium hover:bg-amber-50 dark:hover:bg-neutral-800 rounded-xl transition-colors dark:text-amber-100">
                    <i class="ph ph-house text-xl text-amber-600"></i> Home
                </a>
                <a href="shop.html" class="flex items-center gap-3 px-4 py-3 text-base font-medium bg-amber-100 dark:bg-neutral-800 text-amber-800 dark:text-amber-200 rounded-xl transition-colors">
                    <i class="ph ph-storefront text-xl text-amber-600"></i> Shop
                    <span class="ml-auto px-2 py-0.5 text-xs bg-amber-600 text-white rounded-full">NEW</span>
                </a>
                <a href="index.html#about" class="flex items-center gap-3 px-4 py-3 text-base font-medium hover:bg-amber-50 dark:hover:bg-neutral-800 rounded-xl transition-colors dark:text-amber-100">
                    <i class="ph ph-info text-xl text-amber-600"></i> About
                </a>
                <a href="index.html#contact" class="flex items-center gap-3 px-4 py-3 text-base font-medium hover:bg-amber-50 dark:hover:bg-neutral-800 rounded-xl transition-colors dark:text-amber-100">
                    <i class="ph ph-envelope text-xl text-amber-600"></i> Contact
                </a>
                
                <div class="border-t border-amber-200 dark:border-neutral-700 my-3"></div>
                
                <button onclick="toggleWishlistDrawer(); document.getElementById('mobile-menu').classList.add('hidden')" class="flex items-center gap-3 w-full px-4 py-3 text-base font-medium hover:bg-amber-50 dark:hover:bg-neutral-800 rounded-xl transition-colors dark:text-amber-100">
                    <i class="ph ph-heart text-xl text-red-500"></i> Wishlist
                    <span class="ml-auto bg-red-500 text-white text-xs px-2 py-1 rounded-full ${wishlistCount > 0 ? '' : 'hidden'}">${wishlistCount}</span>
                </button>
                
                <a href="${isLoggedIn() ? 'profile.html' : 'auth.html'}" class="flex items-center gap-3 px-4 py-3 text-base font-medium hover:bg-amber-50 dark:hover:bg-neutral-800 rounded-xl transition-colors dark:text-amber-100">
                    <i class="ph ph-user text-xl text-amber-600"></i> ${isLoggedIn() ? 'My Profile' : 'Login / Register'}
                    ${isLoggedIn() ? '<span class="ml-auto w-2 h-2 bg-green-500 rounded-full"></span>' : ''}
                </a>
                
                <div class="border-t border-amber-200 dark:border-neutral-700 my-3"></div>
                
                <button onclick="toggleDarkMode()" class="flex items-center gap-3 w-full px-4 py-3 text-base font-medium hover:bg-amber-50 dark:hover:bg-neutral-800 rounded-xl transition-colors dark:text-amber-100">
                    <i class="ph ph-moon text-xl hidden dark:block text-yellow-400"></i>
                    <i class="ph ph-sun text-xl dark:hidden text-amber-600"></i>
                    <span class="dark:hidden">Dark Mode</span>
                    <span class="hidden dark:inline">Light Mode</span>
                </button>
            </div>
        </div>
    </nav>
    
    <div id="wishlist-drawer" class="fixed inset-0 z-[60] hidden">
        <div class="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300" onclick="closeWishlistDrawer()"></div>
        <div class="absolute right-0 top-0 h-full w-full max-w-md bg-white dark:bg-neutral-900 shadow-2xl transform transition-transform duration-300 translate-x-full flex flex-col" id="wishlist-panel">
            <div class="p-6 border-b border-amber-100 dark:border-neutral-800 flex justify-between items-center bg-gradient-to-r from-amber-50 to-white dark:from-neutral-900 dark:to-neutral-800">
                <div>
                    <h2 class="font-serif text-2xl font-bold dark:text-white">Your Wishlist</h2>
                    <p class="text-sm text-amber-600 dark:text-amber-400 mt-1">${wishlistCount} ${wishlistCount === 1 ? 'candle' : 'candles'} saved</p>
                </div>
                <button onclick="closeWishlistDrawer()" class="p-2 hover:bg-amber-100 dark:hover:bg-neutral-800 rounded-full dark:text-white transition-colors hover:rotate-90 duration-300">
                    <i class="ph ph-x text-xl"></i>
                </button>
            </div>
            <div id="wishlist-items" class="flex-1 overflow-y-auto p-6 space-y-6 bg-amber-50/50 dark:bg-neutral-900/50">
            </div>
            ${wishlistCount > 0 ? `
            <div class="p-6 border-t border-amber-100 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                <a href="shop.html" class="block w-full bg-amber-800 text-white text-center py-3 rounded-xl font-medium hover:bg-amber-900 transition-colors">
                    Continue Shopping
                </a>
            </div>
            ` : ''}
        </div>
    </div>
    `;
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initDB();
    initDarkMode();
    
    const navPlaceholder = document.getElementById('nav-placeholder');
    if (navPlaceholder) {
        navPlaceholder.innerHTML = renderNav();
    }
    
    setTimeout(updateNavCounts, 100);
});