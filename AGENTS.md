# TrackerSpese

App personale per il tracking delle spese. Ogni schermata di lavoro è Operate: la persona registra, rivede o capisce una spesa. La qualità sta nella precisione, nella scansione e nella coerenza.

Le skill stanno in `~/.agents/skills/<nome>/SKILL.md`. Apri il file in questa sessione e seguilo. Ricordare la skill non conta come lettura.

## Brief

Idea e Stile sono il brief. Un valore `PENDING` è una voce ancora vuota: chiedila e fermati prima di qualsiasi scelta di prodotto o di interfaccia. Compilate, vincono sui default di ogni skill.

### Idea

Tracker delle spese del mese. Si aggiunge una spesa scegliendo il tipo. Ogni spesa ha il nome del servizio.

Tre tipi, distinti da come la cifra cade sui mesi:

- Occasionale. Nome, cifra, data. Vale per quel giorno.
- Abbonamento, solo mensile. Nome, tariffa mensile, giorno di rinnovo. Si disattiva senza una data di scadenza. Un abbonamento attivo entra nel mese anche se il rinnovo è più avanti. La disdetta lascia il mese in corso e toglie il rinnovo da quello successivo.
- Rateizzazione. Nome, data del primo addebito, costo totale, numero di mesi. Compare dal mese del primo addebito, per quel numero di mesi, con la quota (totale diviso mesi). L’ultima quota prende i centesimi che avanzano. Un giorno 31, in un mese più corto, cade l’ultimo giorno.

La schermata principale è solo il mese corrente: le spese che gli appartengono e l’aggiunta di nuove. Il totale somma tutto ciò che appartiene al mese, anche un rinnovo più avanti. Ogni riga mostra il giorno, così si distingue ciò che è già passato da ciò che arriva. Una spesa nuova, anche se è iniziata mesi fa, riporta al mese corrente.

Documenti. Elenco con filtro per anno, da gennaio in alto fino al mese corrente in basso, totale di ogni mese, totale dell’anno in fondo. Ogni mese, compreso quello corrente, apre un rendiconto in sola lettura. Ogni riga ha il download del PDF.

Fatturazioni ricorrenti. Abbonamenti attivi e rateizzazioni attive. La scheda di modifica si apre sopra la pagina da cui parte e, chiusa, riporta lì. La disdetta sta nella modifica dell’abbonamento. L’app sull’iPhone resta in verticale e non si zooma.

### Stile

Fonte: `reference.jpg`, i due telefoni. Quel mondo visivo, applicato alle spese. Il nome e i contenuti crypto della reference restano fuori.

Web app a tutto schermo su iPhone 15, con safe area. Su uno schermo largo la stessa interfaccia sta su un campo lime, dentro una cornice da telefono.

- Sfondo dell’app chiaro. Hero del mese: blocco lime, viola e nero, mese e cifra grandi, illustrazione sul lato.
- Carte bianche, raggio ampio, ombra morbida spostata. Azioni rapide in cerchi.
- Navigazione: pillola blu elettrica in basso, tre icone.
- Illustrazioni isometriche a tratto nero e colori piatti (lime, viola, nero, un accento rosa). Soggetti solo di spesa: scontrino, carta, calendario, rate. Niente immagine decorativa staccata dal contenuto.
- Type geometrica (Outfit), numeri tabulari. Testo scuro sul lime, bianco sulla pillola.
- Motion: press breve sui controlli, sheet dal basso che segue il dito, ingresso corto della lista. La cifra non si anima.

## Percorso

Il percorso scatta quando il compito cambia ciò che si vede o come si muove. Un compito solo di dati o di calcolo si ferma a questo file.

Una superficie è chiusa solo quando ogni criterio sotto è soddisfatto.

### Surface

1. Il Brief non contiene `PENDING`. Criterio: Idea e Stile portano le parole dell'utente.
2. Leggi `frontend-design`. Criterio: la direzione visiva è scritta e coincide con Stile.
3. Leggi `ui-ux-pro-max` e interrogala per un tracker di spese. Criterio: palette, scala tipografica, spaziatura e pattern di prodotto sono scelti e coincidono con Stile. Curve, durate e proprietà animate restano alle skill di Motion.
4. Leggi `impeccable` ed esegui il Setup, poi il playbook del compito (una superficie nuova passa da new-work). Leggi il craft floor subito prima di modificare la UI. Il motion di questo progetto lo implementa la skill `animate` di Emil Kowalski: il comando animate di impeccable resta fuori. Criterio: il craft floor è stato letto e la superficie segue la direzione del punto 2.
5. Leggi `web-design-guidelines` e applicane le regole ai file toccati. Criterio: ogni finding è corretto nel codice.
6. Con la superficie già visibile, esegui `impeccable` critique e poi polish. Criterio: i punti della critique sono chiusi da polish.

### Motion

Prima di scrivere un movimento, leggi `find-animation-opportunities`. Criterio: ogni elemento che si muove ha uno scopo, e gli altri restano fermi.

Poi leggi le skill che descrivono quel movimento:

- `apple-design` per il modello fisico: press, sheet, spring, reduced motion.
- `animate` per realizzarlo. Decide se si muove, lo scopo, lo strumento, le proprietà, la curva, la durata, l'interruzione e l'uscita, in modo coerente con `apple-design`.
- `choreograph` quando più elementi si muovono insieme, come una lista di schede. Decide ordine, sovrapposizione e cosa resta fermo.
- `gestures` quando il dito guida il gesto. L'elemento segue il dito 1:1 e si può riprendere a metà corsa.
- `animation-performance` quando si sceglie la proprietà da animare, o il movimento perde frame.
- `emil-design-eng` solo per un dettaglio di polish che nessuna skill più stretta copre.

Criterio: il movimento accettato è nel codice con curva, durata, interruzione e uscita.

Dopo che il movimento è nel codice, leggi `review-animations`. Criterio: ogni flag è corretto nel codice.

`improve-animations` scatta solo su un audit del motion di tutta l'app. Produce il piano e lascia il codice com'è.

`animation-vocabulary` scatta solo quando l'utente descrive un movimento senza il suo nome. Criterio: l'effetto ha il termine del glossario.
