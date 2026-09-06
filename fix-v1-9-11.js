(() => {
  const VERSION = 'v1.9.11';
  document.title = 'Spørsmålsgenerator ' + VERSION;
  const versionEl = document.querySelector('.version');
  if (versionEl) versionEl.textContent = VERSION;

  // --- Svargrupper for dra-til-bilde ---
  // Tom gruppe = bare det valgte ordet er riktig i ruten.
  // Samme gruppenavn på flere ruter = ordene i disse rutene kan bytte plass.
  const originalRenderImageDropZones = renderImageDropZones;
  renderImageDropZones = function () {
    originalRenderImageDropZones();

    const list = document.getElementById('imageDropList');
    if (!list || !imageDropZones.length) return;

    const help = document.createElement('div');
    help.className = 'notice small';
    help.style.marginBottom = '10px';
    help.innerHTML = '<strong>Svargrupper:</strong> La feltet stå tomt når bare ett bestemt ord er riktig. Gi flere ruter samme gruppenavn når ordene kan bytte plass, for eksempel «Reaktanter» eller «Produkter».';
    list.prepend(help);

    const items = [...list.querySelectorAll('.drop-list-item')];
    items.forEach((item, i) => {
      const zone = imageDropZones[i];
      if (!zone) return;

      const wrap = document.createElement('div');
      wrap.style.marginTop = '10px';
      wrap.innerHTML = `
        <label>Svargruppe <span class="small muted">(valgfritt)</span></label>
        <input class="image-drop-group" data-id="${zone.id}" placeholder="F.eks. Reaktanter" value="${escapeHtml(zone.group || '')}">
        <div class="small muted" style="margin-top:4px">Ruter med samme gruppenavn godtar hverandres riktige ord.</div>`;
      item.insertBefore(wrap, item.querySelector('.drag-actions'));

      const input = wrap.querySelector('.image-drop-group');
      input.addEventListener('input', () => {
        const z = imageDropZones.find(x => x.id === input.dataset.id);
        if (z) z.group = input.value;
      });
    });
  };

  const originalReadImageDropQuestion = readImageDropQuestion;
  readImageDropQuestion = function () {
    const q = originalReadImageDropQuestion();
    q.zones = q.zones.map(z => ({ ...z, group: String(z.group || '').trim() }));
    return q;
  };

  // Hvis en bildeoppgave allerede står åpen når denne filen lastes,
  // tegn redigeringslisten på nytt slik at gruppefeltene vises.
  try {
    if (document.getElementById('questionType')?.value === 'imageDrop' && imageDropZones.length) {
      renderImageDropZones();
    }
  } catch (_) {}

  // --- Behold lagringsrettelsen fra v1.9.10 ---
  const saveBtn = document.getElementById('saveEditsBtn');
  if (saveBtn) {
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

        const titleEl = document.getElementById('taskTitle');
        const difficultyEl = document.getElementById('difficulty');
        if (titleEl?.value.trim()) task.title = titleEl.value.trim();
        if (difficultyEl) task.difficulty = difficultyEl.value;

        tasks[code] = task;
        store.tasks = tasks;
        currentTask = task;
        renderPreview(task);

        const verify = JSON.parse(localStorage.getItem('sg_tasks') || '{}');
        if (!verify[code]) throw new Error('Oppgaven kunne ikke bekreftes lagret i nettleseren.');

        alert('Endringene er lagret.');
      } catch (err) {
        console.error(err);
        alert(err.message || 'Kunne ikke lagre endringene.');
      }
    };
  }

  // --- Gruppebevisst automatisk retting ---
  const submitBtn = document.getElementById('submitBtn');
  if (submitBtn) {
    submitBtn.onclick = (ev) => {
      ev.preventDefault();
      if (!currentTask) return;

      const fd = new FormData(document.getElementById('studentForm'));
      const answers = currentTask.questions.map((q, i) => fd.get('q' + i) || '');
      if (answers.some(a => !String(a).trim())) {
        alert('Svar på alle spørsmål før du leverer. Dra alle kortene til et mål.');
        return;
      }

      let mcTotal = 0, mcCorrect = 0, dragTotal = 0, dragCorrect = 0;

      try {
        const details = currentTask.questions.map((q, i) => {
          if (q.type === 'mc') {
            mcTotal++;
            const ok = answers[i] === q.answer;
            if (ok) mcCorrect++;
            return { type: 'mc', answer: answers[i], correct: ok, correctAnswer: q.answer, prompt: q.prompt };
          }

          if (q.type === 'drag') {
            let placements = [];
            try { placements = JSON.parse(answers[i] || '[]'); } catch (_) {}
            if (placements.length !== q.pairs.length) throw new Error('Alle dra-og-slipp-kort må plasseres.');
            const correctCount = placements.filter(p => p.target === p.card).length;
            dragTotal += q.pairs.length;
            dragCorrect += correctCount;
            return {
              type: 'drag',
              answer: `${correctCount}/${q.pairs.length} riktige plasseringer`,
              correct: correctCount === q.pairs.length,
              correctCount,
              total: q.pairs.length,
              prompt: q.prompt,
              placements
            };
          }

          if (q.type === 'imageDrop') {
            let placements = [];
            try { placements = JSON.parse(answers[i] || '[]'); } catch (_) {}
            if (placements.length !== q.zones.length) throw new Error('Alle ordene må plasseres på bildet.');

            const zones = q.zones.map(z => ({ ...z, group: String(z.group || '').trim().toLocaleLowerCase('nb-NO') }));
            const zoneById = Object.fromEntries(zones.map(z => [z.id, z]));
            const allowedByGroup = {};
            zones.forEach(z => {
              if (!z.group) return;
              if (!allowedByGroup[z.group]) allowedByGroup[z.group] = new Set();
              allowedByGroup[z.group].add(String(z.answer || '').trim());
            });

            const isCorrectPlacement = p => {
              const zone = zoneById[p.zone];
              if (!zone) return false;
              if (String(zone.answer || '').trim() === p.word) return true;
              if (!zone.group) return false;
              return allowedByGroup[zone.group]?.has(p.word) || false;
            };

            const correctCount = placements.filter(isCorrectPlacement).length;
            dragTotal += q.zones.length;
            dragCorrect += correctCount;
            return {
              type: 'imageDrop',
              answer: `${correctCount}/${q.zones.length} riktige plasseringer`,
              correct: correctCount === q.zones.length,
              correctCount,
              total: q.zones.length,
              prompt: q.prompt,
              placements
            };
          }

          return { type: 'text', answer: answers[i], prompt: q.prompt, teacherFeedback: '', status: 'Til vurdering' };
        });

        const response = {
          id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
          code: currentTask.code,
          title: currentTask.title,
          name: document.getElementById('studentName').value.trim(),
          submitted: new Date().toISOString(),
          mcTotal,
          mcCorrect,
          dragTotal,
          dragCorrect,
          details
        };

        const rs = store.responses;
        rs.push(response);
        store.responses = rs;

        document.getElementById('studentTaskCard').classList.add('hidden');
        document.getElementById('studentResult').classList.remove('hidden');
        document.getElementById('studentResult').innerHTML = `
          <h2>Levert</h2>
          <p>Takk, ${escapeHtml(response.name)}. Besvarelsen er registrert.</p>
          ${mcTotal ? `<p class="score">Multiple choice: ${mcCorrect} av ${mcTotal} riktige</p>` : ''}
          ${dragTotal ? `<p class="score">Dra og slipp: ${dragCorrect} av ${dragTotal} riktige</p>` : ''}
          <p class="muted">${currentTask.questions.some(q => q.type === 'text') ? 'Tekstsvar må vurderes av lærer.' : 'Oppgaven er automatisk rettet.'}</p>`;
      } catch (err) {
        console.error(err);
        alert(err.message || 'Kunne ikke levere oppgaven.');
      }
    };
  }
})();
