// Spørsmålsgenerator v1.9
// Forbedring: ChatGPT-import av dra-og-slipp åpner første importerte oppgave
// automatisk og fyller KORT/MÅL direkte inn i redigeringsfeltene.

(function(){
  const importBtn = document.getElementById('importChatBtn');
  if(!importBtn || typeof parseChatQuestions !== 'function') return;

  importBtn.onclick = () => {
    try{
      const questions = parseChatQuestions(document.getElementById('chatImport').value);
      const title = document.getElementById('taskTitle').value.trim() || 'Uten tittel';
      const code = codeFromTitle(title);
      const task = {
        code,
        title,
        text:(sourceMode==='text' ? document.getElementById('sourceText').value : document.getElementById('webText').value).trim(),
        type:'imported',
        count:questions.length,
        difficulty:document.getElementById('difficulty').value,
        questions,
        sourceMode,
        sourceUrl:sourceMode==='web' ? document.getElementById('sourceUrl').value.trim() : '',
        created:new Date().toISOString()
      };

      const tasks = store.tasks;
      tasks[code] = task;
      store.tasks = tasks;

      document.getElementById('taskEmpty').classList.add('hidden');
      document.getElementById('taskCreated').classList.remove('hidden');
      document.getElementById('taskCodeLabel').textContent = code;
      document.getElementById('taskSummary').textContent = `${title} · ${questions.length} spørsmål · importert fra ChatGPT`;
      document.getElementById('taskCreated').dataset.code = code;
      renderPreview(task);

      // Nytt i v1.9: Dra-og-slipp-parene er allerede lest av parseren.
      // Åpne første importerte dra-og-slipp-oppgave direkte i byggeren slik at
      // KORT og MÅL vises ferdig utfylt uten manuell kopiering.
      const firstDragIndex = questions.findIndex(q => q.type === 'drag');
      if(firstDragIndex >= 0){
        const q = questions[firstDragIndex];
        const questionType = document.getElementById('questionType');
        questionType.value = 'drag';
        questionType.dispatchEvent(new Event('change'));
        loadDragBuilder(q);
        window._editingDragQuestionIndex = firstDragIndex;
        window._editingDragTaskCode = code;

        const pairCount = q.pairs ? q.pairs.length : 0;
        document.getElementById('chatImportStatus').innerHTML =
          `<div class="successbox">${questions.length} spørsmål ble importert. Kort og mål er automatisk fylt inn. Første dra-og-slipp-oppgave er åpnet med ${pairCount} ferdige par. De andre kan åpnes med «Rediger dra og slipp» i forhåndsvisningen.</div>`;
      }else{
        document.getElementById('chatImportStatus').innerHTML =
          `<div class="successbox">${questions.length} spørsmål ble importert. Se gjennom og rediger dem før bruk.</div>`;
      }
    }catch(e){
      document.getElementById('chatImportStatus').innerHTML =
        `<div class="warnbox">${escapeHtml(e.message)}</div>`;
    }
  };
})();
