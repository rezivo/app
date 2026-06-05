/* BLOC SETĂRI COMPANIE - modul separat pentru setările firmei */
let setariCompanieLoaded = false;
let setariCompanieCloseCallback = null;

/* BLOC NORMALIZARE TEXT - aliniază denumirile modulelor */
function normalizeRezivoText(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' SI ')
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/* BLOC CITIRE VALORI - acceptă denumiri sigure din Supabase */
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

/* BLOC ELEMENTE SETĂRI - caută elementele după încărcarea paginii separate */
function getSetariCompanieElements() {
  return {
    panel: document.getElementById('settingsPanel'),
    backButton: document.getElementById('settingsBackButton'),
    slotChoiceButtons: document.querySelectorAll('[data-slot-minutes]'),
    moduleCheckboxes: document.querySelectorAll('[data-module-code]'),
    onlineBookingsToggle: document.getElementById('onlineBookingsToggle'),
    confirmationRequiredToggle: document.getElementById('confirmationRequiredToggle')
  };
}

/* BLOC ÎNCĂRCARE HTML - aduce pagina separată în carcasa aplicației */
async function ensureSetariCompanieHtmlLoaded() {
  const { panel } = getSetariCompanieElements();

  if (!panel) {
    throw new Error('Lipsește zona Setări companie din index.');
  }

  if (setariCompanieLoaded && panel.innerHTML.trim()) {
    return;
  }

  const response = await fetch('pages/setari-companie.html', { cache: 'no-store' });

  if (!response.ok) {
    throw new Error('Nu s-a putut încărca pagina Setări companie.');
  }

  panel.innerHTML = await response.text();
  setariCompanieLoaded = true;
}

/* BLOC EVENIMENTE SETĂRI - butonul înapoi din modulul separat */
function attachSetariCompanieEvents(onClose) {
  const { backButton } = getSetariCompanieElements();
  setariCompanieCloseCallback = onClose;

  if (backButton) {
    backButton.onclick = () => {
      if (typeof setariCompanieCloseCallback === 'function') {
        setariCompanieCloseCallback();
      }
    };
  }
}

/* BLOC AFIȘARE SLOT - marchează slotul citit din Supabase */
function setActiveSlotChoice(minutes) {
  const { slotChoiceButtons } = getSetariCompanieElements();

  slotChoiceButtons.forEach((button) => {
    button.classList.toggle('active', Number(button.dataset.slotMinutes) === Number(minutes));
  });
}

/* BLOC AFIȘARE MODULE - marchează modulele active citite din Supabase */
function applyModuleSettings(modules) {
  const { moduleCheckboxes } = getSetariCompanieElements();
  const modulesByCode = new Map();

  modules.forEach((moduleItem) => {
    const code = normalizeRezivoText(readFirstValue(moduleItem, ['cod_modul', 'modul_cod', 'cod', 'cheie', 'nume_modul', 'nume']));
    if (code) modulesByCode.set(code, moduleItem);
  });

  moduleCheckboxes.forEach((checkbox) => {
    const expectedCode = normalizeRezivoText(checkbox.dataset.moduleCode);
    const moduleItem = modulesByCode.get(expectedCode);

    if (!moduleItem) return;

    checkbox.checked = readBooleanValue(
      readFirstValue(moduleItem, ['activ', 'active', 'enabled', 'este_activ'], checkbox.checked),
      checkbox.checked
    );
  });
}

/* BLOC AFIȘARE REGULI - aplică setările generale citite din Supabase */
function applyCompanySettings(settings) {
  const { onlineBookingsToggle, confirmationRequiredToggle } = getSetariCompanieElements();

  const slotMinutes = readFirstValue(settings, ['interval_programari_minute', 'slot_minute', 'durata_slot_minute'], 30);
  setActiveSlotChoice(slotMinutes);

  if (onlineBookingsToggle) {
    onlineBookingsToggle.checked = readBooleanValue(
      readFirstValue(settings, ['permite_programari_online', 'programari_online', 'online_booking_enabled'], onlineBookingsToggle.checked),
      onlineBookingsToggle.checked
    );
  }

  if (confirmationRequiredToggle) {
    confirmationRequiredToggle.checked = readBooleanValue(
      readFirstValue(settings, ['necesita_confirmare', 'confirmare_necesara', 'require_confirmation'], confirmationRequiredToggle.checked),
      confirmationRequiredToggle.checked
    );
  }
}

/* BLOC CITIRE SUPABASE - citește setările companiei fără salvare */
async function loadCompanySettingsForDisplay(profileType, companyId) {
  if (profileType !== 'company_user' || !companyId) {
    showMessage('Setările companiei sunt disponibile doar pentru conturile de companie.', 'error');
    return;
  }

  try {
    const { data: settingsData, error: settingsError } = await rezivoSupabase
      .from('setari_companie')
      .select('*')
      .eq('companie_id', companyId)
      .maybeSingle();

    if (settingsError) throw settingsError;

    if (settingsData) {
      applyCompanySettings(settingsData);
    }

    const { data: modulesData, error: modulesError } = await rezivoSupabase
      .from('module_companie')
      .select('*')
      .eq('companie_id', companyId);

    if (modulesError) throw modulesError;

    applyModuleSettings(modulesData || []);
    hideMessage();
  } catch (error) {
    showMessage(error.message || 'Nu s-au putut citi setările companiei.', 'error');
  }
}


/* BLOC SALVARE SETĂRI COMPANIE - scrie modificările în Supabase */
async function saveCompanySettings(companyId) {
  const { slotChoiceButtons, moduleCheckboxes, onlineBookingsToggle, confirmationRequiredToggle } = getSetariCompanieElements();

  const activeSlot = [...slotChoiceButtons].find(button => button.classList.contains('active'));

  const { error: settingsError } = await rezivoSupabase
    .from('setari_companie')
    .update({
      interval_programari_minute: Number(activeSlot?.dataset.slotMinutes || 30),
      permite_programari_online: onlineBookingsToggle.checked,
      necesita_confirmare: confirmationRequiredToggle.checked
    })
    .eq('companie_id', companyId);

  if (settingsError) throw settingsError;

  for (const checkbox of moduleCheckboxes) {
    await rezivoSupabase
      .from('module_companie')
      .update({ activ: checkbox.checked })
      .eq('companie_id', companyId)
      .eq('cod_modul', checkbox.dataset.moduleCode);
  }

  showMessage('Setările au fost salvate.');
}

function attachSaveCompanySettingsEvent(companyId) {
  const saveButton = document.getElementById('saveCompanySettingsButton');
  const { slotChoiceButtons } = getSetariCompanieElements();

  slotChoiceButtons.forEach(button => {
    button.onclick = () => setActiveSlotChoice(button.dataset.slotMinutes);
  });

  if (saveButton) {
    saveButton.onclick = async () => {
      try {
        await saveCompanySettings(companyId);
      } catch (error) {
        showMessage(error.message || 'Nu s-au putut salva setările.', 'error');
      }
    };
  }
}


/* BLOC PORNIRE MODUL - apelat din auth.js când se deschide Setări companie */
window.loadSetariCompaniePage = async function loadSetariCompaniePage(options) {
  await ensureSetariCompanieHtmlLoaded();

  attachSetariCompanieEvents(options.onClose);
  attachSaveCompanySettingsEvent(options.companyId);

  await loadCompanySettingsForDisplay(options.profileType, options.companyId);
};
