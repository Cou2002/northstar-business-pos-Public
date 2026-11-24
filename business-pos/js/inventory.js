
function saveProduct(form, id = null) {
    const f = new FormData(form),
          name = f.get('name').trim();
    let sku = (f.get('sku') || '').trim();
    if (!sku) {
        const base = name.toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 12) || 'ITEM';
        sku = base + '-' + Date.now().toString().slice(-6);
    }
    const p = {
        id: id || uid('PRD'),
        sku,
        name,
        category: f.get('category').trim() || 'General',
        cost: Number(f.get('cost')),
        price: Number(f.get('price')),
        qty: Number(f.get('qty')),
        min: Number(f.get('min') || 0),
        description: f.get('description') || '',
        created: id ? (db.products.find(x => x.id === id)?.created || nowISO()) : nowISO()
    };
    if (!p.name || p.cost < 0 || p.price < 0 || p.qty < 0 || p.min < 0 || ![p.cost, p.price, p.qty, p.min].every(Number.isFinite)) {
        throw Error('Enter valid product details and non-negative amounts.');
    }
    if (db.products.some(x => x.sku.toLowerCase() === p.sku.toLowerCase() && x.id !== id)) {
        throw Error('That product code already exists.');
    }
    if (id) {
        const old = db.products.find(x => x.id === id);
        if (!old) throw Error('Product not found.');
        if (old.price !== p.price) logActivity('Price modified', `${p.name}: ${money(old.price)} → ${money(p.price)}`);
        Object.assign(old, p);
    } else {
        db.products.unshift(p);
    }
    saveDB();
    logActivity(id ? 'Product edited' : 'Product added', `${p.name} (${p.sku})`);
}
function recordPurchase(form) {
    const f = new FormData(form),
          product = db.products.find(x => x.id === f.get('product')),
          qty = Number(f.get('qty')),
          unit = Number(f.get('cost'));
    if (!product || !Number.isInteger(qty) || qty <= 0 || !Number.isFinite(unit) || unit < 0) {
        throw Error('Select a product and enter a valid quantity and unit cost.');
    }
    const purchase = {
        id: uid('PUR'),
        productId: product.id,
        product: product.name,
        sku: product.sku,
        qty,
        cost: unit,
        total: qty * unit,
        supplier: (f.get('supplier') || '').trim(),
        supplierPhone: (f.get('supplierPhone') || '').trim(),
        method: f.get('method'),
        date: f.get('date') ? new Date(f.get('date') + 'T12:00:00').toISOString() : nowISO(),
        notes: f.get('notes') || '',
        employee: currentUser.name
    };
    product.qty += qty;
    product.cost = unit;
    db.purchases.unshift(purchase);
    saveDB();
    logActivity('Stock purchased', `${qty} × ${product.name} from ${purchase.supplier || 'unspecified supplier'} (${money(purchase.total)})`);
}

function adjustStock(productId, delta, reason) {
    const p = db.products.find(x => x.id === productId);
    if (!p || p.qty + delta < 0) {
        throw Error('Invalid stock adjustment.');
    }
    p.qty += delta;
    db.logs.unshift({
        id: uid('LOG'),
        employee: currentUser.name,
        action: 'Stock adjusted',
        description: `${p.name}: ${delta > 0 ? '+' : ''}${delta} — ${reason}`,
        date: nowISO()
    });
    saveDB();
}