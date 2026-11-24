
function recordSale(form) {
    const f = new FormData(form),
          items = [];
    for (const row of form.querySelectorAll('[data-sale-row]')) {
        const p = db.products.find(x => x.id === row.querySelector('[name="product"]').value);
        const qty = Number(row.querySelector('[name="qty"]').value);
        if (!p || !Number.isInteger(qty) || qty <= 0) {
            throw Error('Select a product and enter a whole-number quantity.');
        }
        if (qty > p.qty) {
            throw Error(`Insufficient stock for ${p.name}. Available: ${p.qty}`);
        }
        items.push({
            productId: p.id,
            name: p.name,
            sku: p.sku,
            qty,
            price: Number(p.price),
            cost: Number(p.cost)
        });
    }
    if (!items.length) {
        throw Error('Add at least one product.');
    }
    const subtotal = items.reduce((sum, i) => sum + i.qty * i.price, 0),
          discount = Number(f.get('discount')) || 0;
    if (discount < 0 || discount > subtotal) {
        throw Error('Invalid discount.');
    }
    if (discount > 0 && !isAdmin()) {
        throw Error('Only an administrator can approve discounts.');
    }
    const customerId = f.get('customerId') || null;
    const typedCustomer = form.querySelector('#posCustomerSearch')?.value.trim() || '';
    if (typedCustomer && !customerId) {
        throw Error('Select the matching customer from the search results, or clear the search to record a walk-in sale.');
    }
    const customer = customerId ? db.customers.find(c => c.id === customerId) : null;
    if (customerId && !customer) {
        throw Error('The selected customer could not be found. Please select the customer again.');
    }
    const total = subtotal - discount,
          paid = Number(f.get('paid'));
    if (!Number.isFinite(paid) || paid < 0 || paid > total) {
        throw Error('Amount paid must be between zero and the sale total.');
    }
    // Validate every line before changing any stock.
    const sale = {
        id: uid('TXN'),
        customerId: customer?.id || null,
        customer: customer?.name || 'Walk-in customer',
        phone: customer?.phone || '',
        items,
        subtotal,
        discount,
        total,
        paid,
        method: f.get('method') || 'Cash',
        employee: currentUser.name,
        date: nowISO(),
        status: 'completed',
        paymentStatus: paid === 0 ? 'Unpaid' : paid < total ? 'Partially paid' : 'Paid'
    };
    items.forEach(i => {
        const product = db.products.find(p => p.id === i.productId);
        product.qty -= i.qty;
    });
    db.sales.unshift(sale);
    saveDB();
    logActivity('Sale recorded', `${sale.id} · ${sale.customer} · ${money(sale.total)}`);
}
function cancelSale(id){
 const s=db.sales.find(x=>x.id===id);if(!s||s.status==='cancelled')return;
 s.items.forEach(i=>{const p=db.products.find(p=>p.id===i.productId);if(p)p.qty+=i.qty;});
 s.status='cancelled';s.cancelledAt=nowISO();s.cancelledBy=currentUser.name;saveDB();logActivity('Sale cancelled',`${s.id}; stock returned to inventory`);
}
