script.js

// --- CONFIG ---
const API_BASE = '/api';

// --- SCROLL TO TOP (NEW FEATURE) ---
document.addEventListener("keydown", (e) => {
    if (e.key.toLowerCase() === "t") {
        window.scrollTo({ top: 0, behavior: "smooth" });
    }
});

// --- THEME ---
function applyTheme(theme) {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    const icon = document.getElementById('themeIcon');
    if (icon) icon.textContent = theme === 'dark' ? '☀️' : '🌙';
}

function toggleTheme() {
    const isDark = document.documentElement.classList.contains('dark');
    const next = isDark ? 'light' : 'dark';
    localStorage.setItem('bb_theme', next);
    applyTheme(next);
}
window.toggleTheme = toggleTheme;

// --- PRODUCTS DATA ---
let products = [];
let bdayCakes = {};
let selectedFlavor = 'Red Velvet';
let selectedWeight = '1.0';
const BIRTHDAY_BASE_PRICES = {
    '0.5': 450,
    '1.0': 850,
    '1.5': 1250,
    '2.0': 1600
};

// buildCatalogFromList(null);
const DEFAULT_PRODUCTS = [
    { id: 1, name: "Velvet Dream Cake", category: "cakes", price: 850, img: "https://theobroma.in/cdn/shop/files/redvelvet-theo.jpg?v=1701321860" },
    { id: 2, name: "Dutch Truffle Delight", category: "cakes", price: 950, img: "https://tse3.mm.bing.net/th/id/OIP.6wMpc_E6xsHLl3zT2ItBSQHaHa?pid=Api&P=0&h=180" },
    { id: 3, name: "Pineapple Fresh Cream", category: "cakes", price: 675, img: "https://theobroma.in/cdn/shop/files/FreshCreamPineappleCakehalfkg_400x400.jpg" }
];

const DEFAULT_BDAY_CAKES = {
    "Red Velvet": { price: 850, img: "https://theobroma.in/cdn/shop/files/redvelvet-theo.jpg?v=1701321860" },
    "Dutch Truffle": { price: 950, img: "https://tse2.mm.bing.net/th/id/OIP.RFIPPxLpOU7C0ryaVA5hMwHaHa?pid=Api&P=0&h=180" }
};
buildCatalogFromList(null);

function useFallbackProducts() {
    products = DEFAULT_PRODUCTS;
    bdayCakes = { ...DEFAULT_BDAY_CAKES };

    if (document.getElementById('productsGrid')) {
        filterProducts('all');
    }
    if (document.getElementById('cakePrice')) {
        calculateBdayPrice();
    }
}

const FAVOURITES_KEY = 'brownie_bliss_favourites';

let favourites = loadFavourites();

function buildCatalogFromList(list) {
    if (list && Array.isArray(list) && list.length) {
        products = list.filter(p => p.type === 'standard').map(p => ({
            id: p.id_ref,
            name: p.name,
            category: p.category,
            price: p.price,
            emoji: p.emoji,
            img: p.img,
            description: p.description || ''
        }));

        bdayCakes = {};
        const bd = list.filter(p => p.type === 'birthday');
        bd.forEach(p => {
            bdayCakes[p.id_ref] = {
                price: p.price,
                emoji: p.emoji,
                img: p.img
            };
        });
    } else {
        useFallbackProducts();
    }
}

async function loadProducts() {
    try {
        const res = await fetch(`${API_BASE}/products`);
        const data = await res.json();

        if (data.success && Array.isArray(data.products) && data.products.length) {

            products = data.products
                .filter(p => p.type === 'standard')
                .map(p => ({
                    id: p.id_ref,
                    name: p.name,
                    category: p.category,
                    price: p.price,
                    emoji: p.emoji,
                    img: p.img,
                    description: p.description || ''
                }));

            bdayCakes = {};

            const bd = data.products.filter(p => p.type === 'birthday');

            bd.forEach(p => {
                bdayCakes[p.id_ref] = {
                    price: p.price,
                    emoji: p.emoji,
                    img: p.img
                };
            });

        } else {
            useFallbackProducts();
        }

    } catch (e) {
        console.error('Error loading products from database:', e);
        useFallbackProducts();
    }

    if (document.getElementById('productsGrid')) {
        filterProducts('all');
    }

    if (document.getElementById('cakePrice')) {
        calculateBdayPrice();
    }
}

// --- CART STATE ---
let cart = JSON.parse(localStorage.getItem('brownie_bliss_cart') || '[]');
let checkoutState = { name: '', phone: '', address: '', city: '', pincode: '', verified: false, currentStep: 1 };

function saveCart() {
    localStorage.setItem('brownie_bliss_cart', JSON.stringify(cart));
}

const cartFooter = document.getElementById('cartFooter');
const cartTotal = document.getElementById('cartTotal');

// --- CART UI ---
function updateCartUI() {
    const cartContainer = document.getElementById('cartItems');
    if (!cartContainer) return;

    if (cart.length === 0) {
        cartContainer.innerHTML = `
  <div class="cart-empty-state">
    <div class="empty-cart-icon">🍫</div>

    <h2>Your cart is empty</h2>

    <p>
      Looks like you haven't added any brownies yet.
    </p>

    <a href="products.html" class="shop-now-btn">
      Shop Now
    </a>
  </div>
`;
        if (cartFooter) cartFooter.style.display = 'none';
    } else {
        cartContainer.innerHTML = cart.map((item, index) => {
            const c = item.customizations;
            let customBadges = '';
            if (c) {
                if (c.dietary) customBadges += `<span class="cart-custom-badge">${c.dietary === 'eggless' ? '🌱 Eggless' : '🥚 Egg'}</span>`;
                if (c.toppings && c.toppings.length) customBadges += c.toppings.map(t => `<span class="cart-custom-badge">+ ${t.name}</span>`).join('');
                if (c.message) customBadges += `<span class="cart-custom-badge cart-custom-msg">✉ "${c.message}"</span>`;
            } else if (item.message) {
                customBadges = `<span class="cart-custom-badge cart-custom-msg">✉ "${item.message}"</span>`;
            }
            return `
            <div class="cart-item">
                <img src="${item.img || 'https://via.placeholder.com/70'}" alt="${item.name}">
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-price">₹${item.price.toLocaleString('en-IN')}</div>
                    ${customBadges ? `<div class="cart-custom-tags">${customBadges}</div>` : ''}
                    <div class="cart-qty">
                        <button class="qty-btn" onclick="changeQty(${index}, -1)">-</button>
                        <span class="qty-num">${item.qty}</span>
                        <button class="qty-btn" onclick="changeQty(${index}, 1)">+</button>
                    </div>
                </div>
                <button class="cart-item-remove" onclick="removeFromCart(${index})">✕</button>
            </div>
        `}).join('');
        if (cartFooter) cartFooter.style.display = 'block';
        const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
        if (cartTotal) cartTotal.textContent = `₹${total.toLocaleString('en-IN')}`;
    }

   
}

// FIXED ADD TO CART
function addToCart(product) {
    const existing = cart.find(i => i.name === product.name);

    if (existing) existing.qty++;
    else cart.push({ ...product, qty: 1 });

    saveCart();
    updateCartUI();
    showToast('Added to cart! 🛒');
}

// FIXED QTY
function changeQty(index, delta) {
    cart[index].qty += delta;
    if (cart[index].qty <= 0) cart.splice(index, 1);
    saveCart();
    updateCartUI();
}


// --- PRODUCT FILTERING ---
function filterProducts(category, btn) {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;

    if (btn) {
        btn.parentElement.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    }

    let filtered = category === 'all'
    ? products
    : products.filter(p => p.category === category);

// PRICE FILTER
if (selectedPriceFilter === 'under200') {
    filtered = filtered.filter(p => p.price < 200);
}
else if (selectedPriceFilter === '200to500') {
    filtered = filtered.filter(
        p => p.price >= 200 && p.price <= 500
    );
}
else if (selectedPriceFilter === 'above500') {
    filtered = filtered.filter(p => p.price > 500);
}

    grid.innerHTML = filtered.map(p => `
        <div class="product-card" onclick='openCustomizeModal(${JSON.stringify(p).replace(/'/g, "&#39;")})' style="cursor:pointer">
            <div class="product-img-wrap">
                <img src="${p.img}" alt="${p.name}">
                <button class="favorite-btn ${isFavourite('dishes', p.id) ? 'active' : ''}"
                    type="button"
                    data-fav-type="dishes"
                    data-fav-id="${p.id}"
                    aria-label="Toggle ${p.name} favourite"
                    aria-pressed="${isFavourite('dishes', p.id) ? 'true' : 'false'}"
                    title="${isFavourite('dishes', p.id) ? 'Remove from favourites' : 'Add to favourites'}"
                    onclick='toggleFavourite("dishes", ${JSON.stringify(p)})'>
                    ${isFavourite('dishes', p.id) ? '&hearts;' : '&#9825;'}
                </button>
                ${p.id < 4 ? '<div class="bestseller-badge">⭐ Bestseller</div>' : ''}
            </div>
            <div class="product-info">
                <div class="product-category">${p.category}</div>
                <div class="product-name">${p.name}</div>
                ${p.description ? `<div class="product-desc">${p.description}</div>` : ''}
                <div class="product-price">₹${p.price}</div>
                <button class="add-to-cart">
                    Customize & Add
                </button>
            </div>
        </div>
    `).join('');
}

// --- BIRTHDAY CAKE BUILDER ---
// bdayCakes object is now populated dynamically via loadProducts()

function updateBirthdayCake(flavor) {

    if (!bdayCakes[flavor]) {
        console.error("Cake flavor not found:", flavor);
        return;
    }

    selectedFlavor = flavor;

    // Update image
    const cakeImg = document.getElementById('birthdayCakeImg');
    if (cakeImg && bdayCakes[flavor]) {
        cakeImg.src = bdayCakes[flavor].img;
    }

    if (cakeImg) {
        cakeImg.src = bdayCakes[flavor].img;
    }

    // Update active flavor button
    document.querySelectorAll('.filter-pill').forEach(btn => {
        if (btn.textContent.trim() === flavor) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    calculateBdayPrice();
}

function setCakeWeight(weight, event) {
    selectedWeight = weight;

    document.querySelectorAll('.weight-btn')
        .forEach(b => b.classList.remove('active'));

    if (event?.target)
        event.target.classList.add('active');

    calculateBdayPrice();
}

function calculateBdayPrice() {
    const price = BIRTHDAY_BASE_PRICES[selectedWeight] || 850;

    const priceEl = document.getElementById('cakePrice');
    if (priceEl) {
        priceEl.textContent = `₹ ${price}`;
    }

    updateBirthdayFavouriteButton();
}

function getBirthdayFavouriteItem() {
    const cake = bdayCakes[selectedFlavor] || {};

    return {
        id: `bday-${selectedFlavor}-${selectedWeight}`,
        name: `${selectedFlavor} Cake (${selectedWeight}kg)`,
        price: BIRTHDAY_BASE_PRICES[selectedWeight],
        img: cake.img || document.getElementById('birthdayCakeImg')?.src || '',
        emoji: cake.emoji || '',
        category: 'cakes'
    };
}

function updateBirthdayFavouriteButton() {
    const btn = document.getElementById('birthdayFavoriteBtn');
    if (!btn) return;

    const item = getBirthdayFavouriteItem();
    const active = isFavourite('dishes', item.id);

    btn.dataset.favType = 'dishes';
    btn.dataset.favId = item.id;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    btn.setAttribute(
        'title',
        active ? 'Remove from favourites' : 'Add to favourites'
    );

    btn.innerHTML = active ? '&hearts;' : '&#9825;';
}


function sendWhatsAppFinal(orderId, itemsSnap, orderTotal) {

    const lines =
        Array.isArray(itemsSnap) && itemsSnap.length
            ? itemsSnap
            : cart;

    const total =
        typeof orderTotal === 'number'
            ? orderTotal
            : lines.reduce((s, i) =>
                s + Number(i.price) * Number(i.qty), 0);

    const itemLines = lines.map(i => {

        let line =
            `• ${i.name} × ${i.qty} = ₹${(
                Number(i.price) * Number(i.qty)
            ).toLocaleString('en-IN')}`;

        if (i.customizations) {

            const c = i.customizations;

            const details = [];

            if (c.dietary) {
                details.push(
                    c.dietary === 'eggless'
                        ? 'Eggless'
                        : 'Egg'
                );
            }

            if (c.toppings?.length) {
                details.push(
                    c.toppings
                        .map(t => `+${t.name}`)
                        .join(', ')
                );
            }

            if (c.message) {
                details.push(`Msg: "${c.message}"`);
            }

            if (details.length) {
                line += `\n   _${details.join(' | ')}_`;
            }
        }

        return line;

    }).join('\n');

    const message =
        `🍫 *New Order Received — Brownie Bliss*\n\n` +
        `📋 *Order ID:* ${orderId}\n` +
        `👤 *Customer:* ${checkoutState.name}\n` +
        `📱 *Phone:* +91 ${checkoutState.phone}\n` +
        `📍 *Address:* ${checkoutState.address}, ${checkoutState.city} - ${checkoutState.pincode}\n\n` +
        `🛒 *Order Details:*\n${itemLines}\n\n` +
        `💰 *Total Amount: ₹${total.toLocaleString('en-IN')}*\n\n` +
        `_Your order has been recorded. Please share payment receipt for confirmation!_ ✨`;

    const waUrl =
        `https://wa.me/918072596340?text=${encodeURIComponent(message)}`;

    window.open(waUrl, '_blank');
}

// --- TOAST ---
function showToast(msg) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
}

// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
    applyTheme(localStorage.getItem('bb_theme') || 'light');
    updateCartUI();
    loadProducts(); // Load and then automatically re-render main grid/birthday block

    
   

    // Track Order auto-fill if on track.html
    const urlParams = new URLSearchParams(window.location.search);
    const idParam = urlParams.get('id');
    const input = document.getElementById('orderIdInput');
    if (idParam && input) {
        input.value = idParam;
        trackOrder(idParam);
    }

});
// Show/hide button on scroll

window.addEventListener("scroll", function () {

    const btn =
        document.getElementById("scrollTopBtn");

    if (!btn) return;

    if (window.scrollY > 300) {
        btn.style.display = "flex";
    } else {
        btn.style.display = "none";
    }
});
// Scroll to top function
function scrollToTop() {

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

