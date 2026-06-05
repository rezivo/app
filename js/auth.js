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
const settingsMenuButton = document.getElementById('settingsMenuButton');
const settingsPanel = document.getElementById('settingsPanel');
const settingsBackButton = document.getElementById('settingsBackButton');

/* BLOC MESAJ */
function showMessage(text, type = 'info') {
  messageBox.textContent = text;
  messageBox.classList.remove('hidden', 'error');

  if (type === 'error') {
    messageBox.classList.add('error');
  }
}

function hideMessage() {
  messageBox.textContent = '';
  messageBox.classList.add('hidden');
  messageBox.classList.remove('error');
}

/* BLOC POPUP CONT */
function openAccountModal() {
  accountModal.classList.remove('hidden');
  accountModal.setAttribute('aria-hidden', 'false');
}

function closeAccountModal() {
  accountModal.classList.add('hidden');
  accountModal.setAttribute('aria-hidden', 'true');
}

/* BLOC SETĂRI COMPANIE */
function openSettingsPanel() {
  dashboardPanel.classList.add('hidden');
  settingsPanel.classList.remove('hidden');
}

function closeSettingsPanel() {
  settingsPanel.classList.add('hidden');
  dashboardPanel.classList.remove('hidden');
}

/* BLOC CURĂȚARE ECRAN */
function resetUserPanel() {
  userPanel.classList.add('hidden');
  dashboardPanel.classList.add('hidden');
  settingsPanel.classList.add('hidden');
  accountInfoButton.classList.add('hidden');
  closeAccountModal();

  dashboardSubtitle.textContent = 'Test aplicație';
  modalName.textContent = '-';
  modalAccountType.textContent = '-';
  modalCompany.textContent = '-';
  modalPost.textContent = '-';
  modalFullAccess.textContent = '-';
}

/* BLOC ADMIN REZIVO */
async function getAdminRezivoProfile(authUserId) {
  const { data, error } = await rezivoSupabase
    .from('admin_rezivo')
    .select('nume, email, activ, super_admin')
    .eq('auth_user_id', authUserId)
    .eq('activ', true)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/* BLOC UTILIZATOR COMPANIE */
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

  if (error) throw error;
  return data;
}

/* BLOC DASHBOARD */
function showDashboard(profileType, profile) {
  dashboardPanel.classList.remove('hidden');
  settingsPanel.classList.add('hidden');
  accountInfoButton.classList.remove('hidden');

  if (profileType === 'admin_rezivo') {
    dashboardSubtitle.textContent = profile.super_admin ? 'Super Admin' : 'Admin Rezivo';
    return;
  }

  dashboardSubtitle.textContent = profile.posturi_companie?.nume || 'Post necunoscut';
}

/* BLOC POPUP DATE CONT */
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

/* BLOC AFIȘARE PROFIL */
function showLoggedUser(profileType, profile) {
  loginForm.classList.add('hidden');
  userPanel.classList.remove('hidden');
  showDashboard(profileType, profile);
  fillAccountModal(profileType, profile);
  hideMessage();
}

/* BLOC VERIFICARE USER LOGAT */
async function loadLoggedUser(authUserId) {
  const adminRezivoProfile = await getAdminRezivoProfile(authUserId);

  if (adminRezivoProfile) {
    showLoggedUser('admin_rezivo', adminRezivoProfile);
    return;
  }

  const companyUserProfile = await getCompanyUserProfile(authUserId);

  if (companyUserProfile) {
    showLoggedUser('company_user', companyUserProfile);
    return;
  }

  await rezivoSupabase.auth.signOut();
  resetUserPanel();
  loginForm.classList.remove('hidden');
  showMessage('Contul există, dar nu are acces configurat în Rezivo.', 'error');
}

/* BLOC LOGIN */
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

    await loadLoggedUser(data.user.id);
  } catch (error) {
    showMessage(error.message || 'Nu s-a putut face login.', 'error');
  } finally {
    loginButton.disabled = false;
    loginButton.textContent = 'Intră în Rezivo';
  }
});

/* BLOC LOGOUT */
async function logoutRezivo() {
  await rezivoSupabase.auth.signOut();
  resetUserPanel();
  loginForm.classList.remove('hidden');
  showMessage('Ai ieșit din Rezivo.');
}

/* BLOC SESIUNE LA REFRESH */
async function checkExistingSession() {
  try {
    const { data, error } = await rezivoSupabase.auth.getSession();

    if (error || !data.session || !data.session.user) {
      return;
    }

    await loadLoggedUser(data.session.user.id);
  } catch (error) {
    console.log('Nu s-a putut verifica sesiunea existentă:', error);
  }
}

/* BLOC EVENIMENTE */
logoutButton.addEventListener('click', logoutRezivo);
modalLogoutButton.addEventListener('click', closeAccountModal);
accountInfoButton.addEventListener('click', openAccountModal);
accountModalClose.addEventListener('click', closeAccountModal);
accountModalBackdrop.addEventListener('click', closeAccountModal);
settingsMenuButton.addEventListener('click', openSettingsPanel);
settingsBackButton.addEventListener('click', closeSettingsPanel);

/* BLOC PORNIRE */
checkExistingSession();
