/* BLOC ELEMENTE HTML - legături cu pagina */
const loginForm = document.getElementById('loginForm');
const loginButton = document.getElementById('loginButton');
const logoutButton = document.getElementById('logoutButton');
const messageBox = document.getElementById('messageBox');
const userPanel = document.getElementById('userPanel');
const dashboardPanel = document.getElementById('dashboardPanel');
const dashboardSubtitle = document.getElementById('dashboardSubtitle');
const accountInfoButton = document.getElementById('accountInfoButton');
const accountModal = document.getElementById('accountModal');
const accountModalBackdrop = document.getElementById('accountModalBackdrop');
const accountModalClose = document.getElementById('accountModalClose');
const modalLogoutButton = document.getElementById('modalLogoutButton');
const modalName = document.getElementById('modalName');
const modalAccountType = document.getElementById('modalAccountType');
const modalCompany = document.getElementById('modalCompany');
const modalPost = document.getElementById('modalPost');
const modalFullAccess = document.getElementById('modalFullAccess');

/* BLOC MESAJ - afișează mesaje fără popup de browser */
function showMessage(text, type = 'info') {
  messageBox.textContent = text;
  messageBox.classList.remove('hidden', 'error');

  if (type === 'error') {
    messageBox.classList.add('error');
  }
}

/* BLOC MESAJ REUȘIT - nu ocupă spațiu după login */
function hideMessage() {
  messageBox.textContent = '';
  messageBox.classList.add('hidden');
  messageBox.classList.remove('error');
}

/* BLOC POPUP CONT - deschide și închide informațiile contului */
function openAccountModal() {
  accountModal.classList.remove('hidden');
  accountModal.setAttribute('aria-hidden', 'false');
}

function closeAccountModal() {
  accountModal.classList.add('hidden');
  accountModal.setAttribute('aria-hidden', 'true');
}

/* BLOC CURĂȚARE ECRAN - ascunde informațiile după logout */
function resetUserPanel() {
  userPanel.classList.add('hidden');
  dashboardPanel.classList.add('hidden');
  accountInfoButton.classList.add('hidden');
  closeAccountModal();

  dashboardSubtitle.textContent = 'Test aplicație';
  modalName.textContent = '-';
  modalAccountType.textContent = '-';
  modalCompany.textContent = '-';
  modalPost.textContent = '-';
  modalFullAccess.textContent = '-';
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
  accountInfoButton.classList.remove('hidden');

  if (profileType === 'admin_rezivo') {
    dashboardSubtitle.textContent = profile.super_admin ? 'Super Admin' : 'Admin Rezivo';
    return;
  }

  dashboardSubtitle.textContent = profile.posturi_companie?.nume || 'Post necunoscut';
}

/* BLOC POPUP DATE CONT - pune informațiile în popup, nu pe pagină */
function fillAccountModal(profileType, profile) {
  if (profileType === 'admin_rezivo') {
    modalName.textContent = profile.nume || '-';
    modalAccountType.textContent = 'Admin Rezivo';
    modalCompany.textContent = 'Rezivo Platform';
    modalPost.textContent = profile.super_admin ? 'Super Admin' : 'Admin Rezivo';
    modalFullAccess.textContent = profile.super_admin ? 'DA' : 'NU';
    return;
  }

  modalName.textContent = profile.nume || '-';
  modalAccountType.textContent = 'Utilizator companie';
  modalCompany.textContent = profile.companii?.nume || 'Companie necunoscută';
  modalPost.textContent = profile.posturi_companie?.nume || 'Post necunoscut';
  modalFullAccess.textContent = profile.posturi_companie?.full_access ? 'DA' : 'NU';
}

/* BLOC AFIȘARE PROFIL - arată dashboardul curat după login */
function showLoggedUser(profileType, profile) {
  loginForm.classList.add('hidden');
  userPanel.classList.remove('hidden');
  showDashboard(profileType, profile);
  fillAccountModal(profileType, profile);
  hideMessage();
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

/* BLOC LOGOUT - ieșire sigură */
async function logoutRezivo() {
  await rezivoSupabase.auth.signOut();
  resetUserPanel();
  loginForm.classList.remove('hidden');
  showMessage('Ai ieșit din Rezivo.');
}

logoutButton.addEventListener('click', logoutRezivo);
modalLogoutButton.addEventListener('click', closeAccountModal);
accountInfoButton.addEventListener('click', openAccountModal);
accountModalClose.addEventListener('click', closeAccountModal);
accountModalBackdrop.addEventListener('click', closeAccountModal);
