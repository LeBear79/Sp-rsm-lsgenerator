(() => {
  const VERSION = 'v1.9.10';
  document.title = 'Spørsmålsgenerator ' + VERSION;
  const versionEl = document.querySelector('.version');
  if (versionEl) versionEl.textContent = VERSION;

  const saveBtn = document.getElementById('saveEditsBtn');
  if (!saveBtn) return;

  saveBtn.onclick = () => {
    const code = document.getElementById('taskCreated')?.dataset.code || '';
    if (!code) return alert('Fant ikke oppgaven som skal lagres.');

    const tasks = store.tasks;
    const task = tasks[code];
    if (!task) return alert('Fant ikke oppgaven i arkivet.');

    try {
      task.questions.forEach((q, i) => {
        const promptEl = document.querySelector(`.editPrompt[data-index="${i}"]`);
        if (promptEl) q.prompt = promptEl.value.trim();

        if (q.type === 'mc') {
          const optionEls = [...document.querySelectorAll(`.editOption[data-q="${i}"]`)];
          if (optionEls.length) {
            q.options = optionEls.map(el => el.value.trim()).filter(Boolean);
            const checked = document.querySelector(`input[type="radio"][name="correct_${i}"]:checked`);
            if (checked) {
              const oi = Number(checked.dataset.o);
              q.answer = (optionEls[oi]?.value || '').trim();
            }
          }
        } else if (q.type === 'drag') {
          // Viktig rettelse: Når en dra-og-slipp-oppgave er åpnet i redigereren,
          // lagres innholdet i byggeren direkte. Vi er ikke lenger avhengige av
          // midlertidige _editing...-variabler som kunne mangle etter åpning fra arkivet.
          const builderVisible = !document.getElementById('dragBuilder')?.classList.contains('hidden');
          const selectedType = document.getElementById('questionType')?.value;
          if (builderVisible && selectedType === 'drag') {
            const pairs = readDragPairs();
            if (pairs.length < 2) throw new Error('Dra-og-slipp-oppgaven må ha minst to komplette par.');
            q.prompt = document.getElementById('dragInstruction')?.value.trim() || q.prompt;
            q.pairs = pairs;
          }
        } else if (q.type === 'imageDrop') {
          const builderVisible = !document.getElementById('imageDropBuilder')?.classList.contains('hidden');
          const selectedType = document.getElementById('questionType')?.value;
          if (builderVisible && selectedType === 'imageDrop') {
            const updated = readImageDropQuestion();
            q.prompt = updated.prompt;
            q.image = updated.image;
            q.words = updated.words;
            q.zones = updated.zones;
          }
        } else {
          const modelEl = document.querySelector(`.editModelAnswer[data-index="${i}"]`);
          if (modelEl) q.modelAnswer = modelEl.value.trim();
        }
      });

      // Oppdater også tittel og innstillinger som kan være endret i lærerfeltet.
      const titleEl = document.getElementById('taskTitle');
      const difficultyEl = document.getElementById('difficulty');
      if (titleEl?.value.trim()) task.title = titleEl.value.trim();
      if (difficultyEl) task.difficulty = difficultyEl.value;

      tasks[code] = task;
      store.tasks = tasks;
      if (typeof currentTask !== 'undefined') currentTask = task;
      renderPreview(task);

      // Les tilbake fra localStorage for å verifisere at lagringen faktisk skjedde.
      const verify = JSON.parse(localStorage.getItem('sg_tasks') || '{}');
      if (!verify[code]) throw new Error('Oppgaven kunne ikke bekreftes lagret i nettleseren.');

      alert('Endringene er lagret.');
    } catch (err) {
      console.error(err);
      alert(err.message || 'Kunne ikke lagre endringene.');
    }
  };
})();
