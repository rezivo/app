/* BLOC ELEMENTE HTML - legături cu pagina */
const loginForm = document.getElementById('loginForm');
const loginButton = document.getElementById('loginButton');
const logoutButton = document.getElementById('logoutButton');
const messageBox = document.getElementById('messageBox');
const userPanel = document.getElementById('userPanel');
const welcomeTitle = document.getElementById('welcomeTitle');
const accountType = document.getElementById('accountType');
const companyInfo = document.getElementById('companyInfo');
const permissionInfo = document.getElementById('permissionInfo');
const dashboardPanel = document.getElementById('dashboardPanel');
const dashboardCompanyName = document.getElementById('dashboardCompanyName');
const dashboardSubtitle = document.getElementById('dashboardSubtitle');
const accessBadge = document.getElementById('accessBadge');

/* BLOC MESAJ - afișează mesaje fără popup de browser */
function showMessage(text, type = 'info') {
  messageBox.textContent = text;
  messageBox.classList.remove('hidden', 'error');

  if (type === 'error') {
    messageBox.classList.add('error');
  }
}

/* BLOC CURĂȚARE ECRAN - ascunde informațiile după logout */
function resetUserPanel() {
  userPanel.classList.add('hidden');
  dashboardPanel.classList.add('hidden');
  welcomeTitle.textContent = 'Conectat';
  accountType.textContent = '';
  companyInfo.textContent = '';
  permissionInfo.textContent = '';
  dashboardCompanyName.textContent = '-';
  dashboardSubtitle.textContent = 'Test aplicație';
  accessBadge.textContent = 'ACCES';
}

/* BLOC ADMIN REZIVO - verifică dacă userul este administrator platformă */
async function getAdminRezivoProfile(authUserId) {
  const { data, error } = await rezivoSupabase
    .from('admin_rezivo')
    .select('nume, email, activ, super_admin')
    .eq('auth_user_id', authUserId)
    .eq('activ', true)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

/* BLOC UTILIZATOR COMPANIE - verifică firma, postul și accesul */
async function getCompanyUserProfile(authUserId) {
  const { data, error } = await rezivoSupabase
    .from('utilizatori')
    .select(`
      nume,
      email,
      activ,
      companii:companie_id(nume, status, activ),
      posturi_companie:post_id(nume, full_access, activ)
    `)
    .eq('auth_user_id', authUserId)
    .eq('activ', true)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

/* BLOC DASHBOARD - pregătește primul ecran vizibil al aplicației */
function showDashboard(profileType, profile) {
  dashboardPanel.classList.remove('hidden');

  if (profileType === 'admin_rezivo') {
    dashboardCompanyName.textContent = 'Rezivo Platform';
    dashboardSubtitle.textContent = profile.super_admin ? 'Super Admin' : 'Admin Rezivo';
    accessBadge.textContent = profile.super_admin ? 'SUPER ADMIN' : 'ADMIN';
    return;
  }

  dashboardCompanyName.textContent = profile.companii?.nume || 'Companie necunoscută';
  dashboardSubtitle.textContent = profile.posturi_companie?.nume || 'Post necunoscut';
  accessBadge.textContent = profile.posturi_companie?.full_access ? 'FULL ACCESS' : 'ACCES LIMITAT';
}

/* BLOC AFIȘARE PROFIL - arată clar cine s-a logat */
function showLoggedUser(profileType, profile) {
  loginForm.classList.add('hidden');
  userPanel.classList.remove('hidden');
  showDashboard(profileType, profile);

  if (profileType === 'admin_rezivo') {
    welcomeTitle.textContent = `Bine ai venit, ${profile.nume}`;
    accountType.textContent = 'Tip cont: Admin Rezivo';
    companyInfo.textContent = 'Acces: platformă Rezivo';
    permissionInfo.textContent = profile.super_admin ? 'Drepturi: Super Admin' : 'Drepturi: Admin Rezivo';
    showMessage('Login reușit. Cont Admin Rezivo identificat corect.');
    return;
  }

  welcomeTitle.textContent = `Bine ai venit, ${profile.nume}`;
  accountType.textContent = 'Tip cont: Utilizator companie';
  companyInfo.textContent = `Companie: ${profile.companii?.nume || 'necunoscută'}`;
  permissionInfo.textContent = `Post: ${profile.posturi_companie?.nume || 'necunoscut'} | FULL_ACCESS: ${profile.posturi_companie?.full_access ? 'DA' : 'NU'}`;
  showMessage('Login reușit. Utilizatorul companiei a fost identificat corect.');
}

/* BLOC LOGIN - conectare prin Supabase Auth */
loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  loginButton.disabled = true;
  loginButton.textContent = 'Se verifică...';
  showMessage('Verificăm datele de login...');
  resetUserPanel();

  try {
    const { data, error } = await rezivoSupabase.auth.signInWithPassword({
      email,
      password
    });

    if (error || !data.user) {
      throw new Error('Email sau parolă greșită.');
    }

    const adminRezivoProfile = await getAdminRezivoProfile(data.user.id);

    if (adminRezivoProfile) {
      showLoggedUser('admin_rezivo', adminRezivoProfile);
      return;
    }

    const companyUserProfile = await getCompanyUserProfile(data.user.id);

    if (companyUserProfile) {
      showLoggedUser('company_user', companyUserProfile);
      return;
    }

    await rezivoSupabase.auth.signOut();
    throw new Error('Contul există, dar nu are acces configurat în Rezivo.');
  } catch (error) {
    showMessage(error.message || 'Nu s-a putut face login.', 'error');
  } finally {
    loginButton.disabled = false;
    loginButton.textContent = 'Intră în Rezivo';
  }
});

/* BLOC LOGOUT - ieșire sigură, fără localStorage */
logoutButton.addEventListener('click', async () => {
  await rezivoSupabase.auth.signOut();
  resetUserPanel();
  loginForm.classList.remove('hidden');
  showMessage('Ai ieșit din Rezivo.');
});
