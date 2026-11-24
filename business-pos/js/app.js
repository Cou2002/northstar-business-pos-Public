const sections = [['MAIN', [['dashboard', '▦', 'Dashboard', 'dashboard'], ['sales', '＋', 'Point of Sale', 'sales'], ['transactions', '⇄', 'Transactions', 'viewSales']]], ['MANAGE', [['inventory', '▤', 'Stock Balance', 'inventory'], ['purchases', '⇧', 'Stock purchases', 'restock'], ['customers', '♙', 'Customers', 'customers'], ['expenses', '₦', 'Expenses', 'expenses'], ['employees', '♧', 'Employees', 'manageEmployees']]], ['INSIGHTS', [['reports', '▥', 'Reports', 'reports'], ['activity', '◷', 'Activity log', 'manageEmployees'], ['settings', '⚙', 'Settings', 'settings']]]]; let activePage = 'dashboard';
const $ = s => document.querySelector(s); const content = $('#content');
function toast(msg, bad = '') { const n = document.createElement('div'); n.className = 'toast ' + (bad === 'bad' ? 'bad' : ''); n.textContent = msg; $('#toastRoot').append(n); setTimeout(() => n.remove(), 3000) }
function showLogin() { $('#appView').classList.add('hidden'); $('#loginView').classList.remove('hidden'); $('#loginPass').value = '' }
function showApp() { $('#loginView').classList.add('hidden'); $('#appView').classList.remove('hidden'); $('#userName').textContent = currentUser.name; $('#userRole').textContent = isAdmin() ? 'Administrator' : 'Employee'; $('#userAvatar').textContent = currentUser.name[0].toUpperCase(); $('#todayLabel').textContent = new Date().toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }); renderNav(); renderPage(activePage) }
function renderNav() { let html = ''; sections.forEach(([group, items]) => { const visible = items.filter(([id, ic, n, p]) => can(p)); if (visible.length) { html += `<div class="nav-section">${group}</div>` + visible.map(([id, ic, n]) => `<button class="nav-link ${activePage === id ? 'active' : ''}" data-page="${id}"><span>${ic}</span><span>${n}</span></button>`).join('') } }); $('#nav').innerHTML = html }
function pageHead(title, desc, button = '') { return `<div class="page-head"><div><h3>${title}</h3><p>${desc}</p></div>${button ? `<div class="actions">${button}</div>` : ''}</div>` }
function stat(label, value, icon, foot = '') { return `<div class="stat-card"><div class="stat-top"><span>${label}</span><span class="stat-icon">${icon}</span></div><div class="stat-value">${value}</div><div class="stat-foot">${foot}</div></div>` }
function table(headers, rows) { return `<div class="table-wrap"><table><thead><tr>${headers.map(x => `<th>${x}</th>`).join('')}</tr></thead><tbody>${rows.length ? rows.join('') : `<tr><td colspan="${headers.length}" class="empty">No records yet. Add your first record to get started.</td></tr>`}</tbody></table></div>` }
function statusBadge(s) { return `<span class="badge ${s === 'completed' || s === 'approved' ? 'success' : s === 'cancelled' || s === 'void' ? 'danger' : 'warning'}">${s}</span>` }
function dateRangeTotal(items, start) { return items.filter(x => new Date(x.date) >= start).reduce((a, x) => a + x.total, 0) }
function renderPage(page) { activePage = page; renderNav(); const titles = { dashboard: 'Dashboard', sales: 'Point of Sale', transactions: 'Transactions', inventory: 'Stock Balance', purchases: 'Stock purchases', customers: 'Customers', expenses: 'Expenses', employees: 'Employees', reports: 'Reports & analytics', activity: 'Activity log', settings: 'Business settings' }; $('#pageTitle').textContent = titles[page] || 'Dashboard'; $('#pageEyebrow').textContent = (page === 'dashboard' ? 'BUSINESS OVERVIEW' : 'MANAGEMENT').toUpperCase(); if (!can(sections.flatMap(s => s[1]).find(x => x[0] === page)?.[3] || 'dashboard')) { content.innerHTML = '<div class="panel empty">You do not have access to this section.</div>'; return } const fn = { dashboard: dashboardPage, sales: salesPage, transactions: transactionsPage, inventory: inventoryPage, purchases: purchasesPage, customers: customersPage, expenses: expensesPage, employees: employeesPage, reports: reportsPage, activity: activityPage, settings: settingsPage }; content.innerHTML = (fn[page] || dashboardPage)(); if (page === 'sales') addSaleRow(); if (page === 'dashboard') drawDashboardCharts(); if (page === 'reports') drawReportChart() }
function originalDashboardPage() { const sales = db.sales.filter(s => s.status !== 'cancelled'), today = new Date(); today.setHours(0, 0, 0, 0); const week = new Date(); week.setDate(week.getDate() - 6); const month = new Date(today.getFullYear(), today.getMonth(), 1); const totalSales = sales.reduce((a, s) => a + s.total, 0), received = sales.reduce((a, s) => a + s.paid, 0), expenses = expenseTotals(), cogs = sales.reduce((a, s) => a + s.items.reduce((v, i) => v + i.cost * i.qty, 0), 0), profit = received - expenses - cogs; const low = db.products.filter(p => p.qty <= p.min).length; return `${pageHead('Business overview', 'A live snapshot of your sales, cash flow and operations.', `<button class="btn primary" data-action="new-sale">＋ New sale</button>`)}<div class="stats-grid">${stat('Total sales', money(totalSales), '↗', 'Value of completed sales')}${stat('Total revenue received', money(received), '₦', 'Confirmed payments')}${stat('Total expenses', money(expenses), '↘', 'Operating expenses')}${stat('Estimated net profit', money(profit), '◈', 'Receipts less cost of goods and expenses')}${stat("Today's sales", money(dateRangeTotal(sales, today)), '◷', 'Since midnight')}${stat('Weekly sales', money(dateRangeTotal(sales, week)), '▥', 'Last 7 days')}${stat('Monthly sales', money(dateRangeTotal(sales, month)), '▦', 'Current month')}${stat('Outstanding balance', money(sales.reduce((a, s) => a + s.total - s.paid, 0)), '!', 'Unpaid customer balances')}${stat('Total products', db.products.length, '▤', 'Products in catalogue')}${stat('Inventory value', money(db.products.reduce((a, p) => a + p.qty * p.cost, 0)), '▣', 'At current purchase cost')}${stat('Low stock products', low, '⚑', low ? 'Needs restocking' : 'Stock levels healthy')}${stat('Total customers', db.customers.length, '♙', 'Registered customers')}${stat('Total employees', db.employees.filter(e => e.role !== 'admin' && e.active).length, '♧', 'Active employee accounts')}${stat('Transactions', sales.length, '⇄', 'Completed sales')}</div><div class="grid-2"><div class="panel"><div class="panel-head"><h4>Sales performance</h4><span>Last 7 days</span></div><canvas id="salesChart" width="700" height="220"></canvas></div><div class="panel"><div class="panel-head"><h4>Expense breakdown</h4><span>By category</span></div><canvas id="expenseChart" width="420" height="220"></canvas></div></div><div class="grid-2"><div class="panel"><div class="panel-head"><h4>Recent transactions</h4><button class="text-btn" data-page="transactions">View all</button></div>${table(['Transaction', 'Customer', 'Date', 'Amount'], sales.slice(0, 5).map(s => `<tr><td><b>${s.id}</b></td><td>${esc(s.customer)}</td><td>${dateFmt(s.date)}</td><td><b>${money(s.total)}</b></td></tr>`))}</div><div class="panel"><div class="panel-head"><h4>Best-selling products</h4><span>By units sold</span></div>${table(['Product', 'Units', 'Sales'], bestProducts().slice(0, 5).map(p => `<tr><td>${esc(p.name)}</td><td>${p.qty}</td><td>${money(p.amount)}</td></tr>`))}</div></div><div class="panel"><div class="panel-head"><h4>Recent business activity</h4><button class="text-btn" data-page="activity">View log</button></div>${table(['User', 'Activity', 'Details', 'Date'], db.logs.slice(0, 5).map(l => `<tr><td>${esc(l.employee)}</td><td>${esc(l.action)}</td><td>${esc(l.description)}</td><td>${dateFmt(l.date)}</td></tr>`))}</div>` }
function bestProducts() { const m = {}; db.sales.filter(s => s.status !== 'cancelled').forEach(s => s.items.forEach(i => { m[i.productId] ??= { name: i.name, qty: 0, amount: 0 }; m[i.productId].qty += i.qty; m[i.productId].amount += i.qty * i.price })); return Object.values(m).sort((a, b) => b.qty - a.qty) }
function inventoryPage() { const q = window.searchInventory || ''; const list = db.products.filter(p => (p.name + ' ' + p.sku + ' ' + p.category).toLowerCase().includes(q.toLowerCase())); return `${pageHead('Inventory', 'Manage products, pricing, stock levels and reorder alerts.', can('addProducts') ? '<button class="btn primary" data-action="product-add">＋ Add product</button>' : '')}<div class="toolbar"><input id="inventorySearch" placeholder="Search name, SKU or category…" value="${esc(q)}"><select id="inventoryFilter"><option value="">All stock levels</option><option value="low">Low stock</option><option value="healthy">Healthy stock</option></select><span class="muted">${list.length} products · ${money(db.products.reduce((a, p) => a + p.qty * p.cost, 0))} stock value</span></div><div class="panel">${table(['Product / SKU', 'Category', 'Qty', 'Min. stock', 'Cost price', 'Selling price', 'Stock value', 'Actions'], list.map(p => `<tr><td><b>${esc(p.name)}</b><br><small>${esc(p.sku)}</small></td><td>${esc(p.category)}</td><td>${p.qty} ${p.qty <= p.min ? '<span class="badge danger">Low</span>' : ''}</td><td>${p.min}</td><td>${money(p.cost)}</td><td>${money(p.price)}</td><td>${money(p.qty * p.cost)}</td><td><div class="table-actions">${can('editProducts') ? `<button class="text-btn" data-action="product-edit" data-id="${p.id}">Edit</button>` : ''}${can('restock') ? `<button class="text-btn" data-action="purchase-product" data-id="${p.id}">Restock</button>` : ''}${can('deleteProducts') ? `<button class="text-btn delete" data-action="product-delete" data-id="${p.id}">Delete</button>` : ''}</div></td></tr>`))}</div>` }
function salesPage() { return `${pageHead('Point of sale', 'Add items to the basket. Product prices are locked to the catalogue.')}<div class="grid-2"><div class="panel"><div class="panel-head"><h4>Sale details</h4><span>Stock is checked before checkout</span></div><form id="saleForm"><div class="form-grid"><div class="wide"><label>Customer name<input name="customer" placeholder="Walk-in customer"></label></div><div><label>Phone number<input name="phone" placeholder="080…"></label></div><div><label>Payment method<select name="method"><option>Cash</option><option>Bank Transfer</option><option>POS</option><option>Other</option></select></label></div></div><div id="saleRows"></div><button type="button" class="btn secondary" id="addSaleRow">＋ Add product</button><div class="form-grid"><div><label>Discount ${isAdmin() ? '(admin approval)' : '(admin only)'}<input name="discount" type="number" min="0" value="0" ${isAdmin() ? '' : 'disabled'}></label></div><div><label>Amount paid<input name="paid" type="number" min="0" value="0" required></label></div></div><div class="notice">The selling price is automatically loaded from inventory. Employees cannot override prices.</div><button class="btn primary full">Complete sale</button></form></div><div class="panel"><div class="panel-head"><h4>Sale summary</h4><span>NGN</span></div><div id="saleSummary" class="empty">Add products to calculate the total.</div></div></div>` }
function transactionsPage() { const q = window.txSearch || ''; const list = db.sales.filter(s => (s.id + ' ' + s.customer + ' ' + s.employee).toLowerCase().includes(q.toLowerCase())); return `${pageHead('Transactions', 'Completed and cancelled sales with immutable item price snapshots.', `<button class="btn secondary" data-action="export-sales">Export CSV</button>`)}<div class="toolbar"><input id="txSearch" placeholder="Search transaction, customer or employee…" value="${esc(q)}"><select id="txMethod"><option value="">All payment methods</option>${['Cash', 'Bank Transfer', 'POS', 'Other'].map(x => `<option>${x}</option>`).join('')}</select></div><div class="panel">${table(['Transaction ID', 'Customer', 'Items', 'Total', 'Paid', 'Method', 'Employee', 'Date', 'Status', 'Action'], list.map(s => `<tr><td><b>${s.id}</b></td><td>${esc(s.customer)}</td><td>${s.items.reduce((a, i) => a + i.qty, 0)} units</td><td>${money(s.total)}</td><td>${money(s.paid)}</td><td>${esc(s.method)}</td><td>${esc(s.employee)}</td><td>${dateFmt(s.date)}</td><td>${statusBadge(s.status)}</td><td>${s.status !== 'cancelled' && can('deleteSales') ? `<button class="text-btn delete" data-action="sale-cancel" data-id="${s.id}">Cancel</button>` : '—'}</td></tr>`))}</div>` }
function purchasesPage() { return `${pageHead('Stock purchases', 'Restock inventory. Purchases are tracked separately from operating expenses.', can('restock') ? '<button class="btn primary" data-action="purchase-add">＋ Record purchase</button>' : '')}<div class="stats-grid">${stat('Purchase records', db.purchases.length, '⇧', 'Recorded stock deliveries')}${stat('Total purchase spend', money(purchaseTotals()), '₦', 'Separate from operating expenses')}${stat('Units purchased', db.purchases.reduce((a, p) => a + p.qty, 0), '▤', 'Across all products')}</div><div class="panel">${table(['Purchase ID', 'Product', 'Qty', 'Unit cost', 'Total', 'Supplier', 'Method', 'Recorded by', 'Date'], db.purchases.map(p => `<tr><td>${p.id}</td><td>${esc(p.product)}</td><td>${p.qty}</td><td>${money(p.cost)}</td><td><b>${money(p.total)}</b></td><td>${esc(p.supplier || '—')}</td><td>${esc(p.method)}</td><td>${esc(p.employee)}</td><td>${dateFmt(p.date)}</td></tr>`))}</div>` }
function expensesPage() { return `${pageHead('Expenses', 'Record day-to-day operating costs. Stock purchases are excluded to avoid double-counting.', can('expenses') ? '<button class="btn primary" data-action="expense-add">＋ Add expense</button>' : '')}<div class="stats-grid">${stat('Total expenses', money(expenseTotals()), '₦', 'Operating costs only')}${stat('Today', money(db.expenses.filter(e => dayKey(e.date) === dayKey(nowISO())).reduce((a, e) => a + e.amount, 0)), '◷', 'Recorded today')}${stat('This month', money(db.expenses.filter(e => new Date(e.date).getMonth() === new Date().getMonth()).reduce((a, e) => a + e.amount, 0)), '▦', 'Current month')}</div><div class="panel">${table(['Expense', 'Category', 'Amount', 'Method', 'Recorded by', 'Date', 'Description', 'Action'], db.expenses.map(e => `<tr><td><b>${esc(e.title)}</b></td><td>${esc(e.category)}</td><td>${money(e.amount)}</td><td>${esc(e.method)}</td><td>${esc(e.employee)}</td><td>${dateFmt(e.date)}</td><td>${esc(e.description || '—')}</td><td>${can('editExpenses') ? `<button class="text-btn" data-action="expense-edit" data-id="${e.id}">Edit</button>` : ''}${can('deleteExpenses') ? `<button class="text-btn delete" data-action="expense-delete" data-id="${e.id}">Void</button>` : ''}</td></tr>`))}</div>` }
function customersPage() { return `${pageHead('Customers', 'Customer records are created automatically when a sale is made.')}<div class="toolbar"><input id="customerSearch" placeholder="Search customer or phone…"></div><div class="panel" id="customerTable">${renderCustomerTable(db.customers)}</div>` }
function renderCustomerTable(list) { return table(['Customer', 'Phone', 'Registered', 'Transactions', 'Total spent', 'History'], list.map(c => { const sales = db.sales.filter(s => s.customerId === c.id && s.status !== 'cancelled'); return `<tr><td><b>${esc(c.name)}</b></td><td>${esc(c.phone || '—')}</td><td>${dateFmt(c.created)}</td><td>${sales.length}</td><td>${money(sales.reduce((a, s) => a + s.total, 0))}</td><td><button class="text-btn" data-action="customer-history" data-id="${c.id}">View history</button></td></tr>` })) }
function employeesPage() { return `${pageHead('Employees', 'Create staff accounts and control access to individual features.', isAdmin() ? '<button class="btn primary" data-action="employee-add">＋ Add employee</button>' : '')}<div class="panel">${table(['Employee', 'Username', 'Status', 'Sales count', 'Sales value', 'Permissions', 'Action'], db.employees.filter(e => e.role !== 'admin').map(e => { const ss = db.sales.filter(s => s.employee === e.name && s.status !== 'cancelled'); return `<tr><td><b>${esc(e.name)}</b></td><td>${esc(e.username)}</td><td>${statusBadge(e.active ? 'Active' : 'Inactive')}</td><td>${ss.length}</td><td>${money(ss.reduce((a, s) => a + s.total, 0))}</td><td>${(e.permissions || []).length} enabled</td><td>${isAdmin() ? `<button class="text-btn" data-action="employee-edit" data-id="${e.id}">Edit access</button>` : ''}</td></tr>` }))}</div>` }
function reportsPage() { return `${pageHead('Reports & analytics', 'Filter business activity and export records for accounting.', `<button class="btn secondary" data-action="export-report">Export sales CSV</button><button class="btn secondary" data-action="print">Print</button>`)}<div class="panel"><div class="report-filters"><label>From<input type="date" id="reportFrom"></label><label>To<input type="date" id="reportTo"></label><button class="btn primary" id="runReport">Apply filter</button></div><div id="reportResults" style="margin-top:20px">${reportResultHTML(db.sales)}</div></div><div class="grid-2" style="margin-top:16px"><div class="panel"><div class="panel-head"><h4>Sales trend</h4></div><canvas id="reportChart" width="700" height="220"></canvas></div><div class="panel"><div class="panel-head"><h4>Product performance</h4></div>${table(['Product', 'Units sold', 'Sales value'], bestProducts().map(p => `<tr><td>${esc(p.name)}</td><td>${p.qty}</td><td>${money(p.amount)}</td></tr>`))}</div></div>` }
function reportResultHTML(list) { const ok = list.filter(s => s.status !== 'cancelled'); return `<div class="stats-grid">${stat('Sales', money(ok.reduce((a, s) => a + s.total, 0)), '↗', 'Filtered period')}${stat('Payments received', money(ok.reduce((a, s) => a + s.paid, 0)), '₦', 'Filtered period')}${stat('Transactions', ok.length, '⇄', 'Filtered period')}${stat('Expenses', money(db.expenses.reduce((a, e) => a + e.amount, 0)), '↘', 'All recorded operating expenses')}</div>${table(['Transaction', 'Customer', 'Sales total', 'Paid', 'Method', 'Employee', 'Date'], ok.map(s => `<tr><td>${s.id}</td><td>${esc(s.customer)}</td><td>${money(s.total)}</td><td>${money(s.paid)}</td><td>${esc(s.method)}</td><td>${esc(s.employee)}</td><td>${dateFmt(s.date)}</td></tr>`))}` }
function activityPage() { return `${pageHead('Activity log', 'Audit trail of logins, sales, stock movements and administrative changes.', `<button class="btn secondary" data-action="export-logs">Export CSV</button>`)}<div class="panel">${table(['User', 'Action', 'Description', 'Date & time'], db.logs.map(l => `<tr><td>${esc(l.employee)}</td><td><b>${esc(l.action)}</b></td><td>${esc(l.description)}</td><td>${dateFmt(l.date)}</td></tr>`))}</div>` }
function settingsPage() { return `${pageHead('Business settings', 'Update the business name and local currency display.')}<div class="panel"><form id="settingsForm" class="form-grid"><div><label>Business name<input name="business" value="${esc(db.settings.business || 'Northstar Business')}"></label></div><div><label>Currency<select name="currency"><option value="NGN">Nigerian Naira (₦)</option></select></label></div><div class="wide"><button class="btn primary">Save settings</button></div></form><div class="notice">Local-only application: data is stored in this browser profile. Use Backup & restore regularly. LocalStorage authentication is suitable for a single-computer demo/workflow, not secure multi-user production access.</div><button class="btn secondary" data-action="backup">Download full JSON backup</button> <button class="btn secondary" data-action="restore">Restore from JSON</button> <button class="btn danger" data-action="reset-demo">Reset all local data</button></div>` }
function drawDashboardCharts() { drawLine($('#salesChart'), 7, db.sales.filter(s => s.status !== 'cancelled').map(s => ({ date: s.date, value: s.total }))); drawBars($('#expenseChart'), Object.entries(db.expenses.reduce((a, e) => (a[e.category] = (a[e.category] || 0) + e.amount, a), {})).map(([name, value]) => ({ name, value }))); }
function drawReportChart() { drawLine($('#reportChart'), 14, db.sales.filter(s => s.status !== 'cancelled').map(s => ({ date: s.date, value: s.total }))); }
function drawLine(canvas, days, records) { if (!canvas) return; const c = canvas.getContext('2d'), w = canvas.width, h = canvas.height; c.clearRect(0, 0, w, h); const vals = Array.from({ length: days }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (days - 1 - i)); return records.filter(r => dayKey(r.date) === dayKey(d)).reduce((a, r) => a + r.value, 0) }), max = Math.max(...vals, 1); c.strokeStyle = '#e9edf4'; c.lineWidth = 1; for (let i = 1; i < 5; i++) { c.beginPath(); c.moveTo(38, h - i * (h - 35) / 4); c.lineTo(w - 10, h - i * (h - 35) / 4); c.stroke() } const pts = vals.map((v, i) => ({ x: 40 + i * (w - 60) / (days - 1), y: h - 25 - v / max * (h - 55) })); c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)); c.strokeStyle = '#3568e8'; c.lineWidth = 3; c.stroke(); c.lineTo(pts.at(-1).x, h - 25); c.lineTo(pts[0].x, h - 25); c.closePath(); c.fillStyle = '#3568e81a'; c.fill(); c.fillStyle = '#7d899a'; c.font = '11px DM Sans';[0, Math.floor(days / 2), days - 1].forEach(i => { const d = new Date(); d.setDate(d.getDate() - (days - 1 - i)); c.fillText(d.toLocaleDateString('en', { day: 'numeric', month: 'short' }), pts[i].x - 20, h - 7) }) }
function drawBars(canvas, items) { if (!canvas) return; const c = canvas.getContext('2d'), w = canvas.width, h = canvas.height; c.clearRect(0, 0, w, h); if (!items.length) { c.fillStyle = '#7d899a'; c.font = '14px DM Sans'; c.fillText('No expenses recorded yet', 20, 40); return } const max = Math.max(...items.map(x => x.value), 1), barH = Math.min(25, (h - 20) / items.length - 8); items.slice(0, 7).forEach((it, i) => { const y = 12 + i * (barH + 9), x = 115, bw = (w - 150) * it.value / max; c.fillStyle = '#edf1f7'; c.fillRect(x, y, w - 145, barH); c.fillStyle = '#3568e8'; c.fillRect(x, y, bw, barH); c.fillStyle = '#526176'; c.font = '11px DM Sans'; c.fillText(it.name.slice(0, 15), 5, y + barH - 6); c.fillText(money(it.value), x + bw + 5, y + barH - 6) }) }
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])) }
function modal(title, body) { $('#modalRoot').innerHTML = `<div class="modal-backdrop" data-close="1"><div class="modal"><div class="modal-head"><h3>${title}</h3><button class="icon-btn" data-close="1">✕</button></div><div class="modal-body">${body}</div></div></div>` }
function productForm(p = {}) { modal(p.id ? 'Edit product' : 'Add product', `<form id="productForm"><div class="form-grid"><div><label>Product name<input name="name" required value="${esc(p.name || '')}"></label></div><div><label>SKU / Product ID<input name="sku" required value="${esc(p.sku || '')}"></label></div><div><label>Category<input name="category" required value="${esc(p.category || 'General')}"></label></div><div><label>Quantity<input name="qty" type="number" min="0" required value="${p.qty ?? 0}"></label></div><div><label>Purchase price (₦)<input name="cost" type="number" min="0" required value="${p.cost ?? 0}"></label></div><div><label>Selling price (₦)<input name="price" type="number" min="0" required value="${p.price ?? 0}" ${!can('changePrices') ? 'readonly' : ''}></label></div><div><label>Minimum stock alert<input name="min" type="number" min="0" value="${p.min ?? 5}"></label></div><div class="wide"><label>Description<textarea name="description">${esc(p.description || '')}</textarea></label></div></div><div class="modal-foot"><button type="button" class="btn secondary" data-close="1">Cancel</button><button class="btn primary">Save product</button></div></form>`); $('#productForm').onsubmit = e => { e.preventDefault(); try { saveProduct(e.target, p.id); const newId = p.id || db.products[0].id; closeModal(); toast('Product saved'); if (window.pendingPurchaseAfterProduct) { window.pendingPurchaseAfterProduct = false; purchaseForm(newId) } else renderPage('inventory') } catch (err) { toast(err.message, 'bad') } } }
function purchaseForm(productId = '') { modal('Record stock purchase', `<form id="purchaseForm"><div class="form-grid"><div class="wide"><label>Product<select name="product" required>${db.products.map(p => `<option value="${p.id}" ${p.id === productId ? 'selected' : ''}>${esc(p.name)} · ${p.qty} in stock</option>`).join('')}</select></label></div><div><label>Quantity purchased<input name="qty" type="number" min="1" required value="1"></label></div><div><label>Unit purchase cost (₦)<input name="cost" type="number" min="0" required></label></div><div><label>Supplier<input name="supplier"></label></div><div><label>Payment method<select name="method"><option>Cash</option><option>Bank Transfer</option><option>POS</option><option>Other</option></select></label></div><div><label>Date purchased<input name="date" type="date" value="${dayKey(nowISO())}"></label></div><div class="wide"><label>Notes<textarea name="notes"></textarea></label></div></div><div class="modal-foot"><button type="button" class="btn secondary" data-close="1">Cancel</button><button class="btn primary">Save purchase & increase stock</button></div></form>`); $('#purchaseForm').onsubmit = e => { e.preventDefault(); try { recordPurchase(e.target); closeModal(); toast('Stock purchase recorded and inventory increased'); renderPage('purchases') } catch (err) { toast(err.message, 'bad') } } }
function expenseForm(e0 = {}) { modal(e0.id ? 'Edit expense' : 'Record expense', `<form id="expenseForm"><div class="form-grid"><div><label>Expense title<input name="title" required value="${esc(e0.title || '')}"></label></div><div><label>Category<select name="category">${['Electricity', 'Transportation', 'Salaries', 'Rent', 'Maintenance', 'Packaging', 'Marketing', 'Miscellaneous'].map(x => `<option ${e0.category === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label></div><div><label>Amount (₦)<input name="amount" type="number" min="1" required value="${e0.amount || ''}"></label></div><div><label>Payment method<select name="method">${['Cash', 'Bank Transfer', 'POS', 'Other'].map(x => `<option ${e0.method === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label></div><div><label>Date<input name="date" type="date" value="${e0.date ? dayKey(e0.date) : dayKey(nowISO())}"></label></div><div class="wide"><label>Description<textarea name="description">${esc(e0.description || '')}</textarea></label></div></div><div class="modal-foot"><button type="button" class="btn secondary" data-close="1">Cancel</button><button class="btn primary">Save expense</button></div></form>`); $('#expenseForm').onsubmit = e => { e.preventDefault(); try { saveExpense(e.target, e0.id); closeModal(); toast('Expense saved'); renderPage('expenses') } catch (err) { toast(err.message, 'bad') } } }
function employeeForm(emp = {}) { modal(emp.id ? 'Edit employee & permissions' : 'Create employee account', `<form id="employeeForm"><div class="form-grid"><div><label>Full name<input name="name" required value="${esc(emp.name || '')}"></label></div><div><label>Username<input name="username" required value="${esc(emp.username || '')}"></label></div><div class="wide"><label>${emp.id ? 'New password (leave blank to keep current)' : 'Initial password'}<input name="password" type="password" ${emp.id ? '' : 'required'}></label></div><div class="wide"><label class="check-row"><input type="checkbox" name="active" ${emp.active !== false ? 'checked' : ''}> Account active</label></div></div><h4>Individual permissions</h4><div class="permission-list">${ALL_PERMS.map(p => `<label class="check-row"><input type="checkbox" name="perm_${p}" ${emp.permissions?.includes(p) ? 'checked' : (!emp.id && DEFAULT_PERMS.includes(p) ? 'checked' : '')}> ${PERM_LABELS[p]}</label>`).join('')}</div><div class="modal-foot"><button type="button" class="btn secondary" data-close="1">Cancel</button><button class="btn primary">Save employee</button></div></form>`); $('#employeeForm').onsubmit = e => { e.preventDefault(); try { saveEmployee(e.target, emp.id); closeModal(); toast('Employee account saved'); renderPage('employees') } catch (err) { toast(err.message, 'bad') } } }
function addSaleRow() { const row = document.createElement('div'); row.dataset.saleRow = '1'; row.className = 'form-grid sale-row'; row.innerHTML = `<div><label>Product<select name="product" required><option value="">Select product</option>${db.products.map(p => `<option value="${p.id}">${esc(p.name)} · ${money(p.price)} · ${p.qty} available</option>`).join('')}</select></label></div><div><label>Quantity<input name="qty" type="number" min="1" value="1" required></label><small class="row-price">Price: —</small> <button type="button" class="text-btn delete remove-row">Remove</button></div>`; $('#saleRows').append(row); row.querySelector('select').onchange = updateSaleSummary; row.querySelector('[name=qty]').oninput = updateSaleSummary; updateSaleSummary() }
function updateSaleSummary() { let sub = 0, lines = []; document.querySelectorAll('[data-sale-row]').forEach(r => { const p = db.products.find(x => x.id === r.querySelector('[name=product]').value), q = +r.querySelector('[name=qty]').value || 0; if (p) { sub += p.price * q; r.querySelector('.row-price').textContent = `${money(p.price)} each · ${p.qty} available`; lines.push(`${esc(p.name)} × ${q}: ${money(p.price * q)}`) } }); const discount = +$('#saleForm')?.querySelector('[name=discount]')?.value || 0; $('#saleSummary').innerHTML = lines.length ? `${lines.map(x => `<p>${x}</p>`).join('')}<hr><p>Subtotal <b style="float:right">${money(sub)}</b></p><p>Discount <b style="float:right">${money(discount)}</b></p><h2>Total <span style="float:right">${money(Math.max(0, sub - discount))}</span></h2>` : 'Add products to calculate the total.'; const paid = $('#saleForm')?.querySelector('[name=paid]'); if (paid && (!paid.value || paid.value === '0')) paid.value = Math.max(0, sub - discount) }
function closeModal() { $('#modalRoot').innerHTML = '' }
function confirmAction(message, fn) { modal('Please confirm', `<p>${message}</p><div class="modal-foot"><button class="btn secondary" data-close="1">Go back</button><button class="btn danger" id="confirmYes">Confirm</button></div>`); $('#confirmYes').onclick = () => { closeModal(); fn() } }
function originalDoAction(action, id) {
    const p = db.products.find(x => x.id === id), e = db.expenses.find(x => x.id === id), emp = db.employees.find(x => x.id === id); switch (action) { case 'new-sale': renderPage('sales'); break; case 'product-add': productForm(); break; case 'product-edit': productForm(p); break; case 'product-delete': confirmAction(`Delete ${esc(p.name)}? Historical sales will remain, but the product will be removed from inventory.`, () => { db.products = db.products.filter(x => x.id !== id); saveDB(); logActivity('Product deleted', p.name); renderPage('inventory') }); break; case 'purchase-add': purchaseForm(); break; case 'purchase-product': purchaseForm(id); break; case 'expense-add': expenseForm(); break; case 'expense-edit': expenseForm(e); break; case 'expense-delete': confirmAction('Void this expense? It will be excluded from expense totals but retained in the audit history.', () => { e.status = 'void'; saveDB(); logActivity('Expense voided', e.title); renderPage('expenses') }); break; case 'employee-add': employeeForm(); break; case 'employee-edit': employeeForm(emp); break; case 'sale-cancel': confirmAction('Cancel this sale? The sold quantities will be returned to inventory and the record retained.', () => { cancelSale(id); toast('Sale cancelled and stock returned'); renderPage('transactions') }); break; case 'export-sales': exportCSV('transactions.csv', [['ID', 'Customer', 'Products', 'Total', 'Paid', 'Method', 'Employee', 'Date', 'Status'], ...db.sales.map(s => [s.id, s.customer, s.items.map(i => `${i.name} x${i.qty}`).join('; '), s.total, s.paid, s.method, s.employee, s.date, s.status])]); break; case 'export-report': exportCSV('sales-report.csv', [['ID', 'Customer', 'Total', 'Paid', 'Method', 'Employee', 'Date'], ...db.sales.map(s => [s.id, s.customer, s.total, s.paid, s.method, s.employee, s.date])]); break; case 'export-logs': exportCSV('activity-log.csv', [['User', 'Action', 'Description', 'Date'], ...db.logs.map(l => [l.employee, l.action, l.description, l.date])]); break; case 'backup': downloadBackup(); break; case 'restore': $('#restoreFile').click(); break; case 'print': window.print(); break; case 'reset-demo': confirmAction('This permanently clears all local products, sales, customers, employees and expenses. Continue?', () => { localStorage.removeItem(DBKEY); db = loadDB(); currentUser = db.employees[0]; showApp(); toast('Local data reset') }); break; case 'customer-history': { const c = db.customers.find(x => x.id === id), ss = db.sales.filter(s => s.customerId === id); modal(`${esc(c.name)} — purchase history`, table(['Transaction', 'Items', 'Total', 'Date', 'Status'], ss.map(s => `<tr><td>${s.id}</td><td>${s.items.map(i => `${esc(i.name)} × ${i.qty}`).join('<br>')}</td><td>${money(s.total)}</td><td>${dateFmt(s.date)}</td><td>${statusBadge(s.status)}</td></tr>`))); break } }
}
$('#loginForm').onsubmit = e => {
    e.preventDefault();
    if (login($('#loginUser').value, $('#loginPass').value)) {
        showApp();
    } else {
        $('#loginError').textContent = 'Incorrect username or password, or account inactive.';
    }
};

$('#logoutBtn').onclick = logout;

$('#menuBtn').onclick = () => $('#sidebar').classList.toggle('open');

$('#quickSaleBtn').onclick = () => {
    if (requirePermission('sales')) {
        renderPage('sales');
    }
};

$('#backupBtn').onclick = downloadBackup;

$('#nav').addEventListener('click', e => {
    const b = e.target.closest('[data-page]');
    if (b) {
        renderPage(b.dataset.page);
        $('#sidebar').classList.remove('open');
    }
});

content.addEventListener('click', e => {
    const pg = e.target.closest('[data-page]');
    if (pg) {
        renderPage(pg.dataset.page);
        return;
    }

    const b = e.target.closest('[data-action]');
    if (b) doAction(b.dataset.action, b.dataset.id);

    if (e.target.closest('#addSaleRow')) addSaleRow();

    if (e.target.closest('.remove-row')) {
        e.target.closest('[data-sale-row]').remove();
        updateSaleSummary();
    }
});

content.addEventListener('input', e => {
    if (e.target.id === 'inventorySearch') {
        window.searchInventory = e.target.value;
        const pos = e.target.selectionStart;
        renderPage('inventory');
        const el = $('#inventorySearch');
        el.focus();
        el.setSelectionRange(pos, pos);
    }

    if (e.target.id === 'txSearch') {
        window.txSearch = e.target.value;
        renderPage('transactions');
    }

    if (e.target.id === 'customerSearch') {
        $('#customerTable').innerHTML = renderCustomerTable(
            db.customers.filter(c => (c.name + ' ' + c.phone).toLowerCase().includes(e.target.value.toLowerCase()))
        );
    }
});

content.addEventListener('change', e => {
    if (e.target.id === 'inventoryFilter') {
        const low = e.target.value === 'low';
        const list = e.target.value
            ? db.products.filter(p => low ? p.qty <= p.min : p.qty > p.min)
            : db.products;
        const holder = content.querySelector('.panel');
        holder.innerHTML = table(
            ['Product / SKU', 'Category', 'Qty', 'Min. stock', 'Cost price', 'Selling price', 'Stock value', 'Actions'],
            list.map(p => `
                <tr>
                    <td><b>${esc(p.name)}</b><br><small>${esc(p.sku)}</small></td>
                    <td>${esc(p.category)}</td>
                    <td>${p.qty}</td>
                    <td>${p.min}</td>
                    <td>${money(p.cost)}</td>
                    <td>${money(p.price)}</td>
                    <td>${money(p.qty * p.cost)}</td>
                    <td><button class="text-btn" data-action="product-edit" data-id="${p.id}">Edit</button></td>
                </tr>
            `)
        );
    }

    if (e.target.id === 'txMethod') {
        const m = e.target.value;
        const rows = db.sales.filter(s => !m || s.method === m);
        const panel = content.querySelector('.panel');
        panel.innerHTML = table(
            ['Transaction ID', 'Customer', 'Items', 'Total', 'Paid', 'Method', 'Employee', 'Date', 'Status', 'Action'],
            rows.map(s => `
                <tr>
                    <td>${s.id}</td>
                    <td>${esc(s.customer)}</td>
                    <td>${s.items.length}</td>
                    <td>${money(s.total)}</td>
                    <td>${money(s.paid)}</td>
                    <td>${s.method}</td>
                    <td>${esc(s.employee)}</td>
                    <td>${dateFmt(s.date)}</td>
                    <td>${statusBadge(s.status)}</td>
                    <td>${s.status !== 'cancelled' && can('deleteSales') ? `<button class="text-btn delete" data-action="sale-cancel" data-id="${s.id}">Cancel</button>` : '—'}</td>
                </tr>
            `)
        );
    }
});

content.addEventListener('submit', e => {
    if (e.target.id === 'saleForm') {
        e.preventDefault();
        try {
            recordSale(e.target);
            toast('Sale completed successfully');
            renderPage('transactions');
        } catch (err) {
            toast(err.message, 'bad');
        }
    }

    if (e.target.id === 'settingsForm') {
        e.preventDefault();
        const f = new FormData(e.target);
        db.settings.business = f.get('business');
        db.settings.currency = f.get('currency');
        saveDB();
        logActivity('Settings updated', 'Business profile changed');
        toast('Settings saved');
    }
});

$('#modalRoot').addEventListener('click', e => {
    if (e.target.dataset.close) closeModal();
});

$('#restoreFile').onchange = e => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
        try {
            const data = JSON.parse(reader.result);
            const required = ['products', 'purchases', 'sales', 'customers', 'employees', 'expenses', 'logs'];
            if (!required.every(k => Array.isArray(data[k])) || !data.employees.some(x => x.role === 'admin')) {
                throw Error('Backup file is missing required business data or an administrator account.');
            }
            confirmAction('Replace the current browser data with this backup?', () => {
                saveDB(data);
                currentUser = null;
                toast('Backup restored. Please sign in again.');
                showLogin();
            });
        } catch (err) {
            toast('Could not restore backup: ' + err.message, 'bad');
        }
    };
    reader.readAsText(file);
    e.target.value = '';
};

content.addEventListener('click', e => {
    if (e.target.id === 'runReport') {
        const from = $('#reportFrom').value,
              to = $('#reportTo').value;
        const list = db.sales.filter(s => (!from || s.date.slice(0, 10) >= from) && (!to || s.date.slice(0, 10) <= to));
        $('#reportResults').innerHTML = reportResultHTML(list);
        drawReportChart();
    }
});

//END

/* Northstar improvements: customer-first horizontal POS and customer records. */
function salesPage() {
    return `${pageHead('Point of Sale', 'Select the customer, add products and record the payment in one horizontal workflow.')}
    <form id="saleForm" class="panel pos-workspace">
        <section class="pos-section">
            <div class="pos-section-title">
                <h4>1. Customer</h4>
                <span>Search a saved customer or choose walk-in</span>
            </div>
            <div class="pos-horizontal customer-line">
                <div class="pos-field customer-search-wrap">
                    <label>Search customer name or phone</label>
                    <input id="posCustomerSearch" autocomplete="off" placeholder="Type customer name or phone number">
                    <div id="customerSuggestions" class="suggestions"></div>
                </div>
                <div class="pos-field">
                    <label>Selected customer</label>
                    <input id="selectedCustomerName" readonly value="Walk-in customer">
                </div>
                <div class="pos-field">
                    <label>Phone number</label>
                    <input id="selectedCustomerPhone" readonly value="—">
                </div>
                <button type="button" class="btn secondary customer-clear" id="walkInBtn">Walk-in</button>
            </div>
            <input type="hidden" name="customerId" id="saleCustomerId">
        </section>
        <section class="pos-section">
            <div class="pos-section-title">
                <h4>2. Products</h4>
                <button type="button" class="btn secondary" id="addSaleRow">＋ Add item</button>
            </div>
            <div class="pos-product-head">
                <span>Product</span>
                <span>Quantity</span>
                <span>Unit price</span>
                <span>Subtotal</span>
                <span></span>
            </div>
            <div id="saleRows" class="pos-rows"></div>
        </section>
        <section class="pos-section">
            <div class="pos-section-title">
                <h4>3. Payment</h4>
            </div>
            <div class="pos-horizontal payment-line">
                <div class="pos-field">
                    <label>Mode of payment</label>
                    <select name="method">
                        <option>Cash</option>
                        <option>Bank Transfer</option>
                        <option>POS</option>
                        <option>Other</option>
                    </select>
                </div>
                <div class="pos-field">
                    <label>Amount paid (₦)</label>
                    <input name="paid" type="number" min="0" step="0.01" value="0" required>
                </div>
                <div class="pos-field">
                    <label>Payment status</label>
                    <input id="paymentStatus" readonly value="Unpaid">
                </div>
                <div class="pos-field">
                    <label>Discount (admin only)</label>
                    <input name="discount" type="number" min="0" value="0" ${isAdmin() ? '' : 'disabled'}>
                </div>
            </div>
        </section>
        <section class="pos-total-row">
            <div>
                <small>Subtotal</small>
                <strong id="posSubtotal">₦0</strong>
            </div>
            <div>
                <small>Total to pay</small>
                <strong id="posTotal">₦0</strong>
            </div>
            <button class="btn primary pos-complete">Complete sale</button>
        </section>
    </form>`;
}

function addSaleRow() {
    const row = document.createElement('div');
    row.dataset.saleRow = '1';
    row.className = 'pos-product-row';
    row.innerHTML = `
        <div class="pos-field">
            <label class="mobile-label">Product</label>
            <select name="product" required>
                <option value="">Search/select product</option>
                ${db.products.map(p => `<option value="${p.id}">${esc(p.name)} · ${esc(p.sku)} · ${p.qty} available</option>`).join('')}
            </select>
        </div>
        <div class="pos-field">
            <label class="mobile-label">Quantity</label>
            <input name="qty" type="number" min="1" value="1" required>
        </div>
        <div class="pos-field">
            <label class="mobile-label">Unit price</label>
            <input class="unit-price" readonly value="—">
        </div>
        <div class="pos-field">
            <label class="mobile-label">Subtotal</label>
            <strong class="line-subtotal">₦0</strong>
        </div>
        <div class="pos-remove">
            <button type="button" class="text-btn delete remove-row">Remove</button>
        </div>
    `;
    $('#saleRows').append(row);
    row.querySelector('select').addEventListener('change', updateSaleSummary);
    row.querySelector('[name=qty]').addEventListener('input', updateSaleSummary);
    updateSaleSummary();
}

function updateSaleSummary() {
    let sub = 0;
    document.querySelectorAll('[data-sale-row]').forEach(r => {
        const p = db.products.find(x => x.id === r.querySelector('[name=product]').value);
        const q = Number(r.querySelector('[name=qty]').value) || 0;
        r.querySelector('.unit-price').value = p ? money(p.price) : '—';
        r.querySelector('.line-subtotal').textContent = p ? money(p.price * q) : money(0);
        if (p) sub += p.price * q;
    });
    const discount = Number($('#saleForm')?.querySelector('[name=discount]')?.value) || 0;
    const total = Math.max(0, sub - discount);
    if ($('#posSubtotal')) $('#posSubtotal').textContent = money(sub);
    if ($('#posTotal')) $('#posTotal').textContent = money(total);
    const paid = Number($('#saleForm')?.querySelector('[name=paid]')?.value) || 0;
    if ($('#paymentStatus')) $('#paymentStatus').value = paid <= 0 ? 'Unpaid' : paid < total ? 'Partially paid' : 'Paid';
}

function customerForm(c = {}) {
    modal(c.id ? 'Edit customer' : 'Add new customer', `<form id="customerForm"><div class="form-grid">
 <div class="wide"><label>Full name<input name="name" required value="${esc(c.name || '')}"></label></div>
 <div><label>Phone number<input name="phone" value="${esc(c.phone || '')}"></label></div>
 <div><label>Date registered<input name="created" type="date" value="${c.created ? dayKey(c.created) : dayKey(nowISO())}"></label></div>
 <div class="wide"><label>Address (optional)<textarea name="address">${esc(c.address || '')}</textarea></label></div>
 </div><div class="modal-foot"><button type="button" class="btn secondary" data-close="1">Cancel</button><button class="btn primary">Save customer</button></div></form>`);
    $('#customerForm').onsubmit = e => {
        e.preventDefault(); const f = new FormData(e.target), name = f.get('name').trim(), phone = f.get('phone').trim();
        if (!name) return toast('Enter the customer name', 'bad');
        if (phone && db.customers.some(x => x.phone === phone && x.id !== c.id)) return toast('That phone number is already registered', 'bad');
        const record = c.id ? db.customers.find(x => x.id === c.id) : { id: uid('CUS'), created: nowISO() };
        Object.assign(record, { name, phone, address: f.get('address').trim(), created: f.get('created') ? new Date(f.get('created') + 'T12:00:00').toISOString() : (record.created || nowISO()) });
        if (!c.id) db.customers.unshift(record);
        saveDB(); logActivity(c.id ? 'Customer updated' : 'Customer registered', name); closeModal(); toast('Customer saved'); renderPage('customers');
    };
}
function customersPage() {
    return `${pageHead('Customers', 'Create customer records and review each customer’s purchase history.', `<button class="btn primary" data-action="customer-add">＋ Add customer</button>`)}
 <div class="toolbar"><input id="customerSearch" placeholder="Search customer name or phone…"></div><div class="panel" id="customerTable">${renderCustomerTable(db.customers)}</div>`;
}
function renderCustomerTable(list) {
    return table(['Customer', 'Phone', 'Address', 'Registered', 'Transactions', 'Total spent', 'Actions'], list.map(c => {
        const ss = db.sales.filter(s => s.customerId === c.id && s.status !== 'cancelled');
        return `<tr><td><b>${esc(c.name)}</b></td><td>${esc(c.phone || '—')}</td><td>${esc(c.address || '—')}</td><td>${dateFmt(c.created)}</td><td>${ss.length}</td><td>${money(ss.reduce((a, s) => a + s.total, 0))}</td><td><button class="text-btn" data-action="customer-history" data-id="${c.id}">History</button> <button class="text-btn" data-action="customer-edit" data-id="${c.id}">Edit</button></td></tr>`;
    }));
}
function inventoryPage() {
    const q = window.searchInventory || '', filter = window.stockFilter || '', sort = window.stockSort || '';
    const list = db.products.filter(p => (p.name + ' ' + p.sku + ' ' + p.category).toLowerCase().includes(q.toLowerCase())).filter(p => !filter || (filter === 'low' ? p.qty > 0 && p.qty <= p.min : filter === 'out' ? p.qty === 0 : filter === 'healthy' ? p.qty > p.min : true)).sort((a, b) => sort === 'asc' ? a.qty - b.qty : sort === 'desc' ? b.qty - a.qty : 0);
    return `${pageHead('Stock Balance', 'Current stock available in your store, including stock value and reorder status.', can('addProducts') ? '<button class="btn primary" data-action="product-add">＋ Add new product</button>' : '')}
 <div class="toolbar"><input id="inventorySearch" placeholder="Search product name, SKU or category…" value="${esc(q)}"><select id="inventoryFilter"><option value="">All stock statuses</option><option value="healthy" ${filter === 'healthy' ? 'selected' : ''}>In Stock</option><option value="low" ${filter === 'low' ? 'selected' : ''}>Low Stock</option><option value="out" ${filter === 'out' ? 'selected' : ''}>Out of Stock</option></select><select id="stockSort"><option value="">Default order</option><option value="asc" ${sort === 'asc' ? 'selected' : ''}>Quantity: low to high</option><option value="desc" ${sort === 'desc' ? 'selected' : ''}>Quantity: high to low</option></select><span class="muted">${list.length} products · ${money(list.reduce((a, p) => a + p.qty * p.cost, 0))} stock value</span></div>
 <div class="panel">${table(['Product name / SKU', 'Category', 'Stock balance', 'Cost price', 'Selling price', 'Total stock value', 'Minimum', 'Status', 'Actions'], list.map(p => `<tr><td><b>${esc(p.name)}</b><br><small>${esc(p.sku)}</small></td><td>${esc(p.category)}</td><td><b>${p.qty}</b></td><td>${money(p.cost)}</td><td>${money(p.price)}</td><td>${money(p.qty * p.cost)}</td><td>${p.min}</td><td>${p.qty === 0 ? '<span class="badge danger">Out of Stock</span>' : p.qty <= p.min ? '<span class="badge warning">Low Stock</span>' : '<span class="badge success">In Stock</span>'}</td><td><div class="table-actions">${can('editProducts') ? `<button class="text-btn" data-action="product-edit" data-id="${p.id}">Edit</button>` : ''}${can('restock') ? `<button class="text-btn" data-action="purchase-product" data-id="${p.id}">Record purchase</button>` : ''}${can('deleteProducts') ? `<button class="text-btn delete" data-action="product-delete" data-id="${p.id}">Delete</button>` : ''}</div></td></tr>`))}</div>`;
}
function productForm(p = {}) {
    modal(p.id ? 'Edit product' : 'Add new product', `<form id="productForm"><div class="form-grid">
 <div><label>Product name<input name="name" required value="${esc(p.name || '')}"></label></div>
 <div><label>SKU / product code (optional)<input name="sku" value="${esc(p.sku || '')}" placeholder="Auto-generated if blank"></label></div>
 <div><label>Category<input name="category" required value="${esc(p.category || 'General')}"></label></div>
 <div><label>Initial / current stock quantity<input name="qty" type="number" min="0" required value="${window.pendingPurchaseAfterProduct ? 0 : (p.qty ?? 0)}" ${window.pendingPurchaseAfterProduct ? "readonly" : ""}></label></div>
 <div><label>Cost price (₦)<input name="cost" type="number" min="0" step="0.01" required value="${p.cost ?? 0}"></label></div>
 <div><label>Selling price (₦)<input name="price" type="number" min="0" step="0.01" required value="${p.price ?? 0}" ${!can('changePrices') ? 'readonly' : ''}></label></div>
 <div><label>Minimum stock level<input name="min" type="number" min="0" value="${p.min ?? 5}"></label></div>
 <div class="wide"><label>Description (optional)<textarea name="description">${esc(p.description || '')}</textarea></label></div>
 </div><div class="modal-foot"><button type="button" class="btn secondary" data-close="1">Cancel</button><button class="btn primary">Save product</button></div></form>`);
    $('#productForm').onsubmit = e => { e.preventDefault(); try { saveProduct(e.target, p.id); const newId = p.id || db.products[0].id; closeModal(); toast('Product saved'); if (window.pendingPurchaseAfterProduct) { window.pendingPurchaseAfterProduct = false; purchaseForm(newId) } else renderPage('inventory') } catch (err) { toast(err.message, 'bad') } };
}
function doAction(action, id) {
    if (action === 'customer-add') { customerForm(); return }
    if (action === 'customer-edit') { customerForm(db.customers.find(c => c.id === id) || {}); return }
    if (action === 'new-sale') { renderPage('sales'); return }
    originalDoAction(action, id);
}
content.addEventListener('click', e => {
    const pick = e.target.closest('[data-customer-pick]');
    if (pick) { const c = db.customers.find(x => x.id === pick.dataset.customerPick); if (c) { $('#saleCustomerId').value = c.id; $('#selectedCustomerName').value = c.name; $('#selectedCustomerPhone').value = c.phone || '—'; $('#posCustomerSearch').value = c.name; $('#customerSuggestions').innerHTML = ''; } return }
    if (e.target.id === 'walkInBtn') { $('#saleCustomerId').value = ''; $('#selectedCustomerName').value = 'Walk-in customer'; $('#selectedCustomerPhone').value = '—'; $('#posCustomerSearch').value = ''; $('#customerSuggestions').innerHTML = ''; }
});
content.addEventListener('input', e => {
    if (e.target.id === 'posCustomerSearch') {
        const q = e.target.value.trim().toLowerCase(), box = $('#customerSuggestions');
        if (!box) return;
        const matches = q ? db.customers.filter(c => (c.name + ' ' + c.phone).toLowerCase().includes(q)).slice(0, 8) : [];
        box.innerHTML = matches.length ? matches.map(c => `<button type="button" data-customer-pick="${c.id}"><b>${esc(c.name)}</b><small>${esc(c.phone || 'No phone')}</small></button>`).join('') : '';
    }
    if (e.target.name === 'paid' || e.target.name === 'discount') updateSaleSummary();
    if (e.target.id === 'customerSearch') $('#customerTable').innerHTML = renderCustomerTable(db.customers.filter(c => (c.name + ' ' + c.phone).toLowerCase().includes(e.target.value.toLowerCase())));
});
content.addEventListener('change', e => { if (e.target.id === 'inventoryFilter') { window.stockFilter = e.target.value; renderPage('inventory') } if (e.target.id === 'stockSort') { window.stockSort = e.target.value; renderPage('inventory') } });


function dashboardPage() {
    let html = originalDashboardPage();
    const out = db.products.filter(p => p.qty === 0).length;
    const units = db.products.reduce((sum, p) => sum + p.qty, 0);
    const recentPurchases = db.purchases.slice(0, 5);
    html = html.replace('</div><div class="grid-2">', `${stat('Total stock units', units, '▤', 'Units currently available')}${stat('Out of stock', out, '⚑', 'Products requiring replenishment')}</div><div class="grid-2">`);
    const recentPanel = `<div class="panel" style="margin-top:16px"><div class="panel-head"><h4>Recent stock purchases</h4><button class="text-btn" data-page="purchases">View all purchases</button></div>${table(['Product', 'Quantity', 'Supplier', 'Total cost', 'Date'], recentPurchases.map(p => `<tr><td>${esc(p.product)}</td><td>${p.qty}</td><td>${esc(p.supplier || '—')}</td><td>${money(p.total)}</td><td>${dateFmt(p.date)}</td></tr>`))}</div>`;
    html += recentPanel;
    return html;
}
function purchaseForm(productId = '') {
    modal('Record stock purchase', `<form id="purchaseForm"><div class="form-grid">
 <div class="wide"><label>Product<select name="product" required>${db.products.map(p => `<option value="${p.id}" ${p.id === productId ? 'selected' : ''}>${esc(p.name)} · ${p.qty} in stock</option>`).join('')}</select></label>
 <button type="button" class="text-btn" id="purchaseCreateProduct">＋ Create a new product</button></div>
 <div><label>Quantity purchased<input name="qty" type="number" min="1" step="1" required value="1"></label></div>
 <div><label>Unit purchase cost (₦)<input name="cost" type="number" min="0" step="0.01" required></label></div>
 <div><label>Supplier / vendor name<input name="supplier" placeholder="Supplier name"></label></div>
 <div><label>Supplier phone (optional)<input name="supplierPhone" placeholder="Phone number"></label></div>
 <div><label>Payment method<select name="method"><option>Cash</option><option>Bank Transfer</option><option>POS</option><option>Other</option></select></label></div>
 <div><label>Purchase date<input name="date" type="date" value="${dayKey(nowISO())}"></label></div>
 <div class="wide"><label>Additional notes<textarea name="notes"></textarea></label></div>
 </div><div class="modal-foot"><button type="button" class="btn secondary" data-close="1">Cancel</button><button class="btn primary">Save purchase & increase stock</button></div></form>`);
    $('#purchaseCreateProduct').onclick = () => { window.pendingPurchaseAfterProduct = true; productForm() };
    $('#purchaseForm').onsubmit = e => { e.preventDefault(); try { recordPurchase(e.target); closeModal(); toast('Stock purchase recorded and stock balance updated'); renderPage('purchases') } catch (err) { toast(err.message, 'bad') } };
}
function purchasesPage() {
    return `${pageHead('Stock purchases', 'Record supplier purchases and track where each new delivery came from.', can('restock') ? '<button class="btn primary" data-action="purchase-add">＋ Record stock purchase</button>' : '')}
 <div class="stats-grid">${stat('Purchase records', db.purchases.length, '⇧', 'Recorded stock deliveries')}${stat('Total purchase spend', money(purchaseTotals()), '₦', 'Tracked separately from operating expenses')}${stat('Units purchased', db.purchases.reduce((a, p) => a + p.qty, 0), '▤', 'Across all products')}</div>
 <div class="panel">${table(['Purchase ID', 'Product', 'Qty', 'Unit cost', 'Total cost', 'Supplier', 'Supplier phone', 'Method', 'Recorded by', 'Purchase date'], db.purchases.map(p => `<tr><td>${esc(p.id)}</td><td>${esc(p.product)}</td><td>${p.qty}</td><td>${money(p.cost)}</td><td><b>${money(p.total)}</b></td><td>${esc(p.supplier || '—')}</td><td>${esc(p.supplierPhone || '—')}</td><td>${esc(p.method)}</td><td>${esc(p.employee)}</td><td>${dateFmt(p.date)}</td></tr>`))}</div>`;
}

// Restore the previous session in this browser.
if (db.user) { const u = db.employees.find(e => e.id === db.user && e.active); if (u) { currentUser = { ...u }; showApp() } else showLogin() } else showLogin();
