# Spørsmålsgenerator v1.0

Denne versjonen er laget som en enkel GitHub Pages-app.

## Dette fungerer i v1.0
- Lærer limer inn fagtekst.
- Velg Multiple choice, Tekstsvar eller Begge.
- Velg antall spørsmål og vanskelighetsgrad.
- Appen lager en oppgavekode.
- Elev kan åpne oppgaven med navn + kode.
- Multiple choice rettes automatisk.
- Tekstsvar lagres og kan få lærertilbakemelding.
- Svaroversikt for lærer.

## Viktig begrensning i v1.0
Data lagres i nettleserens localStorage. Det betyr at lærer og elev må bruke samme nettleser/enhet for at oppgaver og svar skal være synlige.

Dette er bevisst i første versjon for å få arbeidsflyten på plass før vi kobler på Firebase.

## Neste naturlige steg
v1.1 / v2 kan kobles til Firebase:
- Firestore for oppgaver og besvarelser
- Firebase Authentication for lærerinnlogging
- Elev kan levere fra egen PC/iPad
- Lærer ser alle besvarelser fra sin konto

KI-generering bør kobles til via en sikker server/backend. Ikke legg OpenAI API-nøkkel direkte i index.html.
