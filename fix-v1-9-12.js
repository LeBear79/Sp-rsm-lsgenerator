(() => {
  const VERSION = 'v1.9.12';
  document.title = 'Spørsmålsgenerator ' + VERSION;
  const versionEl = document.querySelector('.version');
  if (versionEl) versionEl.textContent = VERSION;

  // Gjør ordene i «Legg til riktig ord» slettbare.
  // Hvis et ord allerede er brukt i en rute, varsles læreren før ordet fjernes.
  renderImageDropWordBank = function () {
    const panel = document.getElementById('imageDropWordPanel');
    const bank = document.getElementById('imageDropWordBank');
    if (!panel || !bank) return;

    panel.classList.remove('hidden');
    if (!imageDropWords.length) {
      bank.innerHTML = '<span class="small muted">Ingen ord lagt inn ennå.</span>';
      return;
    }

    const used = new Set(
      imageDropZones.map(z => String(z.answer || '').toLocaleLowerCase('nb-NO'))
    );

    bank.innerHTML = imageDropWords.map((w, i) => {
      const key = w.toLocaleLowerCase('nb-NO');
      const selected = selectedImageDropWord === w ? 'selected' : '';
      const usedClass = used.has(key) ? 'used' : '';
      return `
        <span class="image-word-item" data-index="${i}" style="display:inline-flex;align-items:center;gap:4px;margin:2px 4px 2px 0">
          <button type="button" class="teacher-word-chip ${selected} ${usedClass}" data-word="${escapeHtml(w)}">${escapeHtml(w)}</button>
          <button type="button" class="remove-image-word" data-index="${i}" title="Slett ${escapeHtml(w)}" aria-label="Slett ${escapeHtml(w)}" style="width:30px;height:30px;border-radius:50%;border:1px solid #fecaca;background:#fff;color:#b91c1c;font-weight:800;cursor:pointer;line-height:1">×</button>
        </span>`;
    }).join('');

    bank.querySelectorAll('.teacher-word-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        selectedImageDropWord = btn.dataset.word;
        renderImageDropWordBank();
      });
    });

    bank.querySelectorAll('.remove-image-word').forEach(btn => {
      btn.addEventListener('click', () => {
        const index = Number(btn.dataset.index);
        const word = imageDropWords[index];
        if (!word) return;

        const key = word.toLocaleLowerCase('nb-NO');
        const affected = imageDropZones.filter(
          z => String(z.answer || '').toLocaleLowerCase('nb-NO') === key
        );

        if (affected.length) {
          const ok = confirm(`«${word}» er brukt i ${affected.length} svarrute${affected.length === 1 ? '' : 'r'}. Vil du slette ordet og tømme ${affected.length === 1 ? 'denne ruten' : 'disse rutene'}?`);
          if (!ok) return;
          affected.forEach(z => { z.answer = ''; });
        }

        imageDropWords.splice(index, 1);
        if (selectedImageDropWord === word) selectedImageDropWord = '';

        // Tegn både rutelisten og ordlisten på nytt, slik at alt holder seg synkronisert.
        renderImageDropZones();
      });
    });
  };

  // Oppdater ordlisten med sletteknapper med én gang hvis bildebyggeren er åpen.
  try {
    renderImageDropWordBank();
  } catch (_) {}
})();
