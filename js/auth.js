/* BLOC ELEMENTE HTML - legături cu pagina */
const loginForm = document.getElementById('loginForm');
const loginButton = document.getElementById('loginButton');
const passwordInput = document.getElementById('password');
const togglePasswordButton = document.getElementById('togglePasswordButton');
const forgotPasswordButton = document.getElementById('forgotPasswordButton');
const resetPasswordPanel = document.getElementById('resetPasswordPanel');
const resetPasswordForm = document.getElementById('resetPasswordForm');
const newPasswordInput = document.getElementById('newPassword');
const confirmNewPasswordInput = document.getElementById('confirmNewPassword');
const saveNewPasswordButton = document.getElementById('saveNewPasswordButton');
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
const slotChoiceButtons = document.querySelectorAll('[data-slot-minutes]');
const moduleCheckboxes = document.querySelectorAll('[data-module-code]');
const onlineBookingsToggle = document.getElementById('onlineBookingsToggle');
const confirmationRequiredToggle = document.getElementById('confirmationRequiredToggle');

/* BLOC STARE UTILIZATOR - păstrează compania curentă pentru setări */
let currentProfileType = null;
let currentCompanyId = null;


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

/* BLOC PAROLĂ LOGIN */
function togglePasswordVisibility() {
  if (passwordInput.type === 'password') {
    passwordInput.type = 'text';
    togglePasswordButton.textContent = '🙈';
    togglePasswordButton.setAttribute('aria-label', 'Ascunde parola');
    return;
  }

  passwordInput.type = 'password';
  togglePasswordButton.textContent = '👁';
  togglePasswordButton.setAttribute('aria-label', 'Arată parola');
}

/* BLOC RESETARE PAROLĂ */
function isPasswordRecoveryLink() {
  return window.location.href.includes('type=recovery');
}

function showResetPasswordPanel() {
  loginForm.classList.add('hidden');
  userPanel.classList.add('hidden');
  dashboardPanel.classList.add('hidden');
  settingsPanel.classList.add('hidden');
  accountInfoButton.classList.add('hidden');
  resetPasswordPanel.classList.remove('hidden');
  closeAccountModal();
  showMessage('Alege o parolă nouă pentru contul tău.');
}

function hideResetPasswordPanel() {
  resetPasswordPanel.classList.add('hidden');
  newPasswordInput.value = '';
  confirmNewPasswordInput.value = '';
}

/* BLOC AJUTOR SETĂRI COMPANIE */
function normalizeRezivoText(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' SI ')
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function readBooleanValue(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (value === 1 || value === '1') return true;
  if (value === 0 || value === '0') return false;
  if (typeof value === 'string') {
    const normalizedValue = value.trim().toLowerCase();
    if (['true', 'da', 'yes', 'active', 'activ'].includes(normalizedValue)) return true;
    if (['false', 'nu', 'no', 'inactive', 'inactiv'].includes(normalizedValue)) return false;
  }
  return fallback;
}

function readFirstValue(source, keys, fallback = null) {
  if (!source) return fallback;

  for (const key of keys) {
    if (source[key] !== undefined && source[key] !== null) {
      return source[key];
    }
  }

  return fallback;
}

function setActiveSlotChoice(minutes) {
  slotChoiceButtons.forEach((button) => {
    button.classList.toggle('active', Number(button.dataset.slotMinutes) === Number(minutes));
  });
}

function applyModuleSettings(modules) {
  const modulesByCode = new Map();

  modules.forEach((moduleItem) => {
    const code = normalizeRezivoText(readFirstValue(moduleItem, ['cod_modul', 'modul_cod', 'cod', 'cheie', 'nume_modul', 'nume']));
    if (code) modulesByCode.set(code, moduleItem);
  });

  moduleCheckboxes.forEach((checkbox) => {
    const expectedCode = normalizeRezivoText(checkbox.dataset.moduleCode);
    const moduleItem = modulesByCode.get(expectedCode);

    if (!moduleItem) return;

    checkbox.checked = readBooleanValue(readFirstValue(moduleItem, ['activ', 'active', 'enabled', 'este_activ'], checkbox.checked), checkbox.checked);
  });
}

function applyCompanySettings(settings) {
  const slotMinutes = readFirstValue(settings, ['interval_programari_minute', 'slot_minute', 'durata_slot_minute'], 30);
  setActiveSlotChoice(slotMinutes);

  onlineBookingsToggle.checked = readBooleanValue(
    readFirstValue(settings, ['permite_programari_online', 'programari_online', 'online_booking_enabled'], onlineBookingsToggle.checked),
    onlineBookingsToggle.checked
  );

  confirmationRequiredToggle.checked = readBooleanValue(
    readFirstValue(settings, ['necesita_confirmare', 'confirmare_necesara', 'require_confirmation'], confirmationRequiredToggle.checked),
    confirmationRequiredToggle.checked
  );
}

async function loadCompanySettingsForDisplay() {
  if (currentProfileType !== 'company_user' || !currentCompanyId) {
    showMessage('Setările companiei sunt disponibile doar pentru conturile de companie.', 'error');
    return;
  }

  try {
    const { data: settingsData, error: settingsError } = await rezivoSupabase
      .from('setari_companie')
      .select('*')
      .eq('companie_id', currentCompanyId)
      .maybeSingle();

    if (settingsError) throw settingsError;

    if (settingsData) {
      applyCompanySettings(settingsData);
    }

    const { data: modulesData, error: modulesError } = await rezivoSupabase
      .from('module_companie')
      .select('*')
      .eq('companie_id', currentCompanyId);

    if (modulesError) throw modulesError;

    applyModuleSettings(modulesData || []);
    hideMessage();
  } catch (error) {
    showMessage(error.message || 'Nu s-au putut citi setările companiei.', 'error');
  }
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
async function openSettingsPanel() {
  dashboardPanel.classList.add('hidden');
  settingsPanel.classList.remove('hidden');
  showMessage('Citesc setările companiei...');
  await loadCompanySettingsForDisplay();
}

function closeSettingsPanel() {
  settingsPanel.classList.add('hidden');
  dashboardPanel.classList.remove('hidden');
}

/* BLOC CURĂȚARE ECRAN */
function resetUserPanel() {
  currentProfileType = null;
  currentCompanyId = null;
  userPanel.classList.add('hidden');
  dashboardPanel.classList.add('hidden');
  settingsPanel.classList.add('hidden');
  accountInfoButton.classList.add('hidden');
  hideResetPasswordPanel();
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
      companie_id,
      post_id,
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
  currentProfileType = profileType;
  currentCompanyId = profileType === 'company_user' ? profile.companie_id : null;

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

/* BLOC TRIMITERE EMAIL RESETARE PAROLĂ */
async function sendPasswordResetEmail() {
  const email = document.getElementById('email').value.trim();

  if (!email) {
    showMessage('Scrie emailul contului, apoi apasă „Am uitat parola”.', 'error');
    return;
  }

  forgotPasswordButton.disabled = true;
  forgotPasswordButton.textContent = 'Se trimite emailul...';

  try {
    const { error } = await rezivoSupabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + window.location.pathname
    });

    if (error) throw error;

    showMessage('Ți-am trimis email pentru resetarea parolei. Verifică și Spam/Promotions.');
  } catch (error) {
    showMessage(error.message || 'Nu s-a putut trimite emailul de resetare.', 'error');
  } finally {
    forgotPasswordButton.disabled = false;
    forgotPasswordButton.textContent = 'Am uitat parola';
  }
}

/* BLOC SALVARE PAROLĂ NOUĂ */
resetPasswordForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const newPassword = newPasswordInput.value;
  const confirmNewPassword = confirmNewPasswordInput.value;

  if (newPassword.length < 6) {
    showMessage('Parola trebuie să aibă minimum 6 caractere.', 'error');
    return;
  }

  if (newPassword !== confirmNewPassword) {
    showMessage('Parolele nu sunt identice.', 'error');
    return;
  }

  saveNewPasswordButton.disabled = true;
  saveNewPasswordButton.textContent = 'Se salvează...';

  try {
    const { error } = await rezivoSupabase.auth.updateUser({
      password: newPassword
    });

    if (error) throw error;

    await rezivoSupabase.auth.signOut();
    hideResetPasswordPanel();
    resetUserPanel();
    loginForm.classList.remove('hidden');
    window.history.replaceState({}, document.title, window.location.pathname);
    showMessage('Parola a fost schimbată. Te poți conecta cu parola nouă.');
  } catch (error) {
    showMessage(error.message || 'Nu s-a putut schimba parola.', 'error');
  } finally {
    saveNewPasswordButton.disabled = false;
    saveNewPasswordButton.textContent = 'Salvează parola nouă';
  }
});

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

    if (isPasswordRecoveryLink()) {
      showResetPasswordPanel();
      return;
    }

    await loadLoggedUser(data.session.user.id);
  } catch (error) {
    console.log('Nu s-a putut verifica sesiunea existentă:', error);
  }
}

/* BLOC EVENIMENTE */
togglePasswordButton.addEventListener('click', togglePasswordVisibility);
forgotPasswordButton.addEventListener('click', sendPasswordResetEmail);
logoutButton.addEventListener('click', logoutRezivo);
modalLogoutButton.addEventListener('click', closeAccountModal);
accountInfoButton.addEventListener('click', openAccountModal);
accountModalClose.addEventListener('click', closeAccountModal);
accountModalBackdrop.addEventListener('click', closeAccountModal);
settingsMenuButton.addEventListener('click', openSettingsPanel);
settingsBackButton.addEventListener('click', closeSettingsPanel);

/* BLOC PORNIRE */
checkExistingSession();
