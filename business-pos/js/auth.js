let currentUser = null;

function login(username, password) {
    const e = db.employees.find(x => x.username.toLowerCase() === username.toLowerCase() && x.password === password && x.active);
    if (!e) return false;
    currentUser = { ...e };
    console.log(e);
    db.user = e.id;
    saveDB();
    logActivity('Login', 'Signed in to the system');
    return true;
}

function logout() {
    if (currentUser) logActivity('Logout', 'Signed out');
    currentUser = null;
    db.user = null;
    saveDB();
    showLogin();
}

function isAdmin() {
    return currentUser?.role === 'admin';
}

function can(p) {
    return isAdmin() || !!currentUser?.permissions?.includes(p);
}

function requirePermission(p) {
    if (!can(p)) {
        toast('You do not have permission to perform this action.', 'bad');
        return false;
    }
    return true;
}