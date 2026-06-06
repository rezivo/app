/* BLOC PROGRAMARE NOUĂ - încarcă pagina separată fără să mărească index.html */
window.loadProgramareNouaPage = async function loadProgramareNouaPage(options = {}) {
  const panel = document.getElementById('programareNouaPanel');

  if (!panel) {
    return;
  }

  if (!panel.dataset.loaded) {
    const response = await fetch(panel.dataset.page);

    if (!response.ok) {
      throw new Error('Nu s-a putut încărca pagina Programare nouă.');
    }

    panel.innerHTML = await response.text();
    panel.dataset.loaded = 'true';
  }

  const backButton = document.getElementById('programareNouaBackButton');

  if (backButton && typeof options.onClose === 'function') {
    backButton.onclick = options.onClose;
  }

  /* BLOC CLIENT - momentan doar pregătim câmpurile, fără salvare și fără Supabase */
  const clientSearchInput = document.getElementById('programareClientSearch');

  if (clientSearchInput) {
    clientSearchInput.focus();
  }
};
