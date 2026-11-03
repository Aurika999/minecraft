# Orașul Meu — descrierea aplicației

**Orașul Meu** este un joc de construit orașe care rulează în browser, pe calculator și pe telefon. Ești primarul: pornești de la un teren gol, cu iarbă, apă și păduri, și îl transformi într-un oraș. Construiești drumuri, desenezi zone, pui servicii și ai grijă de buget.

Jocul este făcut cu **React 18**, **three.js** (grafică 3D izometrică) și **Vite**.

---

## Cum pornești jocul

```bash
cd city-builder
npm install
npm run dev
```

Apoi deschizi http://localhost:5174/ în browser. Pe telefon, conectat la aceeași rețea Wi-Fi, folosești adresa „Network” pe care o afișează Vite.

Pentru o versiune finală, rulezi `npm run build`. Rezultatul apare în folderul `dist/`.

### Instalare pe telefon

Jocul se poate instala ca aplicație (PWA). Apeși butonul **📲 Instalează**: îl găsești în bara de sus, în meniul ☰ și pe ecranul de bun venit. Jocul apare apoi pe ecranul telefonului, cu iconița lui, și pornește și fără internet. Pe iPhone, butonul arată pașii: Partajează ⬆️ → *Adaugă pe ecranul principal*.

Instalarea merge doar când jocul e deschis de pe o adresă **https://** (sau `localhost` pe calculator).

---

## Scopul jocului

Nu există un final fix. Încerci să ai un oraș **cât mai mare**, cu **oameni mulțumiți** și **bani în bancă**. Începi cu **20.000 $**, iar timpul curge zi cu zi, lună cu lună, începând din ianuarie 2026.

## Primii pași

1. 🛣️ Trage un **drum**.
2. 🏠 🏬 🏭 Pune **zone** de-a lungul drumului: locuințe, comerț, industrie.
3. ⚡ Construiește o **centrală**, ca zonele să aibă curent.
4. 💧 Pune un **turn de apă**, ca să crească clădirile.
5. 🌳 👮 🚒 🏫 Adaugă parcuri și servicii. Oamenii vor fi mulțumiți, iar clădirile vor crește mai înalte.

---

## Unelte

| Unealtă | Cost | Întreținere / lună | Rază | Ce face |
|---|---|---|---|---|
| 🔍 Info | — | — | — | Arată detalii despre un pătrățel |
| 🛣️ Drum | 10 $ | 1 $ / pătrățel | — | Zonele cresc doar lângă drumuri, la cel mult 2 pătrățele |
| 🛤️ Cale ferată | 25 $ | 2 $ / pătrățel | — | Șine pe care circulă trenuri. Peste drum face trecere la nivel, peste apă pod |
| 🐄 Fermă | 600 $ | — | — | Animale sau păsări la alegere. Aduce între **+45 și +110 $ / lună** |
| 🎡 Parc de distracții | 1.200 $ | 20 $ | 6 | Roată mare, carusel, montagne russe, chioșcuri. Vinde bilete: **+60 $ / lună** |
| 🚉 Gară | 1.500 $ | 30 $ | 10 | Aduce mai multe trenuri și crește valoarea terenului |
| 🌉 Pod (drum peste apă) | 60 $ | 3 $ / pătrățel | — | Leagă malurile. Se face tot cu unealta Drum |
| 🏠 Locuințe (R) | 20 $ | — | — | Aici se mută oamenii |
| 🏢 Blocuri (H) | 40 $ | — | — | Blocuri cu etaje: încap foarte mulți oameni |
| 🏬 Comerț (C) | 25 $ | — | — | Magazine și birouri, dau locuri de muncă |
| 🏭 Industrie (I) | 25 $ | — | — | Multe locuri de muncă, dar poluează |
| ⚡ Centrală | 3.000 $ | 80 $ | 12 | Dă curent. Poluează puțin în jur |
| 🌬️ Eoliană | 600 $ | 5 $ | 6 | Curent fără poluare. Vinde energie: **+45 $ / lună** |
| ☀️ Panouri solare | 900 $ | 5 $ | 7 | Curent fără poluare. Vinde energie: **+70 $ / lună** |
| 💧 Turn de apă | 1.200 $ | 30 $ | 10 | Fără apă, clădirile rămân la nivelul 1 |
| 🌳 Parc | 150 $ | 2 $ | 4 | Crește valoarea terenului |
| 🌷 Curte cu flori | 40 $ | 1 $ | 3 | Gard viu, alee și straturi de flori. Crește valoarea terenului |
| 🥕 Legume | 30 $ | — | — | Varză, morcovi, roșii sau dovleci. Se culeg și se vând |
| 👮 Poliție | 800 $ | 40 $ | 9 | Mai multă siguranță și valoare |
| 🚒 Pompieri | 800 $ | 40 $ | 9 | Fără pompieri pot izbucni incendii |
| 🏫 Școală | 1.000 $ | 50 $ | 9 | Educația crește valoarea terenului |
| 🚜 Demolează | 5 $ | — | — | Dărâmă clădiri sau taie pădurea |

Unelte după modul în care se folosesc:

- **Drum:** tragi o linie, care poate face un colț în formă de L.
- **Zone, parcuri și demolare:** tragi un dreptunghi.
- **Clădiri de serviciu:** atingi un singur pătrățel.

Când construiești peste pădure, costul crește cu **5 $** pe pătrățel.

**Poduri:** când tragi un drum peste apă, acea porțiune devine automat pod, cu două arce albe de oțel întinse pe toată lungimea podului și tiranți până la carosabil. Cu cât podul e mai lung, cu atât arcul e mai înalt. Un pătrățel de pod costă **60 $** și **3 $** pe lună. Pe apă se pot construi doar poduri. Dacă demolezi un pod, apa rămâne la loc.

---

## Cum funcționează orașul

### Creșterea clădirilor

Fiecare pătrățel de zonă are un **nivel de la 0 la 3**. Nivelul 0 înseamnă zonă goală.

| Nivel | Locuitori (R) | Locuri de muncă (C) | Locuri de muncă (I) |
|---|---|---|---|
| 1 | 8 | 6 | 10 |
| 2 | 30 | 20 | 30 |
| 3 | 90 | 60 | 70 |

O zonă crește doar dacă:

- are **drum** aproape și **curent electric**. Fără acestea, rămâne goală;
- are **apă**. Fără apă, se oprește la nivelul 1;
- are **valoarea terenului** peste 50%, ca să ajungă la nivelul 2, și peste 70%, ca să ajungă la nivelul 3;
- există **cerere** pentru tipul ei de zonă.

Dacă aceste condiții dispar, clădirile scad treptat la un nivel mai mic.

### Blocurile cu etaje

Zona 🏢 **Blocuri** e pentru locuințe dese. Pe ea cresc doar blocuri, în trei stiluri: bloc lung cu balcoane colorate, turn modern cu plăci la fiecare etaj și grădină pe acoperiș, sau bloc din cărămidă cu casa scării din sticlă.

| Nivel | Etaje | Locuitori |
|---|---|---|
| 1 | 4–6 | 45 |
| 2 | 8–10 | 120 |
| 3 | 14–16 | 240 |

Blocurile au nevoie de drum, curent și **neapărat apă**: fără apă nu se construiesc deloc. Ajung la nivelul 2 de la 45% valoarea terenului și la nivelul 3 de la 62%. Folosesc aceeași cerere ca locuințele (bara **R**). Pentru că aduc mulți oameni, au nevoie de multe locuri de muncă în jur (comerț și industrie). Altfel cererea scade și blocurile cresc încet.

### Cererea R / C / I

În fereastra 📊 **Buget**, jos, la „Ce își doresc oamenii”, barele arată ce tip de zonă se cere acum (bara spre dreapta = cerere, spre stânga = prea mult):

- **R (locuințe)** crește când sunt multe locuri de muncă libere.
- **C (comerț)** și **I (industrie)** cresc odată cu populația.
- Taxele peste 9% scad cererea. Taxele sub 9% o cresc. Când mulțumirea e scăzută, scade și cererea de locuințe.

### Valoarea terenului

Valoarea terenului crește lângă **parcuri**, **poliție**, **școli**, **pompieri** și **apă** (râuri, lacuri). Scade puternic din cauza **poluării** făcute de industrie și de centrale. Poluarea nu le deranjează însă pe fabrici: ele cresc chiar și lângă alte fabrici.

### Mulțumirea

Mulțumirea locuitorilor depinde de:

- valoarea terenului unde locuiesc;
- șomaj, adică mai mulți oameni decât locuri de muncă;
- taxe mari.

În bara de sus, mulțumirea apare ca 😊, 😐 sau 😟.

### Bugetul

La sfârșitul fiecărei luni, care durează 30 de zile:

- **Venit** = (populație × 10 + locuri de muncă × 6) × taxa / 100 + legumele vândute + energia vândută + produsele de la fermă
- **Cheltuieli** = întreținerea drumurilor și podurilor + întreținerea serviciilor

Butonul 📊 deschide raportul lunii trecute și cursorul pentru **taxe**, între 0% și 20%. Valoarea implicită este 9%, care e echilibrată.

### Energie curată și ferme: bani în plus

- 🌬️ **Eolienele** au elicele care se învârt. Trage peste mai multe pătrățele și faci un parc eolian.
- ☀️ **Panourile solare** sunt panouri albastre, înclinate spre soare.
- Amândouă dau curent clădirilor din jur, la fel ca centrala, dar **nu poluează** și **vând energie** în fiecare lună.
- 🐄 **Ferma** pornește cu vaci. Apasă pe ea cu 🔍 Info (meniul se deschide singur imediat după ce o construiești) și alege ce vrei să crești:

| Ce crești | Produs | Preț | Venit pe lună |
|---|---|---|---|
| 🐄 Vaci | lapte | 300 $ | +80 $ |
| 🐖 Porci | carne | 250 $ | +70 $ |
| 🐑 Oi | lână | 250 $ | +65 $ |
| 🐐 Capre | brânză | 200 $ | +60 $ |
| 🐴 Cai | plimbări călare | 500 $ | +110 $ |
| 🐔 Găini | ouă | 100 $ | +45 $ |
| 🦃 Curcani | carne de curcan | 200 $ | +60 $ |
| 🦆 Rațe | ouă și pene | 150 $ | +50 $ |

  Animalele sunt în 3D și **se plimbă prin țarc**: merg, se opresc, se întorc, iar păsările ciugulesc. Animalele stau în hambar roșu, păsările în coteț. Rațele au un lac, porcii au o baltă cu noroi.
- Toate se amortizează în câteva luni. În 📊 Buget apar la „Energie vândută” și „Lapte și ouă de la fermă”.

### Parcul de distracții

Tragi 🎡 **Parc de distracții** peste mai multe pătrățele. Fiecare pătrățel primește altă atracție:
- **roata mare**, care se învârte, cu cabine colorate care atârnă mereu drept;
- **caruselul**, cu acoperiș în dungi roșii și albe și căluți, care se rotește;
- **montagne russe**, cu șină roșie pe stâlpi și vagonete care urcă și coboară;
- **chioșcul** cu vată de zahăr și baloane colorate.

Fiecare pătrățel vinde bilete (**+60 $ pe lună**, la „Bilete la parcul de distracții” în buget) și crește valoarea terenului din jur.

### Calea ferată și trenurile

Cu 🛤️ **Cale ferată** tragi șine, la fel ca drumurile. Când treci cu șinele peste un drum (sau cu drumul peste șine), se face automat o **trecere la nivel**, cu indicatoare. Mașinile o traversează, iar trenurile trec prin ea. Peste apă se face un **pod de cale ferată** (60 $).

Când ai cel puțin 3 pătrățele de șine, apare un **tren cu locomotivă cu aburi** și 2–4 vagoane colorate. Fiecare 🚉 **Gară** mai aduce un tren, până la 6. Trenurile aleg singure drumul la ramificații, iar la capăt de linie se întorc. Gara se întoarce cu copertina spre șine.

### Legumele

Pe fiecare pătrățel cu 🥕 Legume crește un singur fel de legumă: varză, morcovi, roșii, dovleci, porumb, vinete sau grâu. Parcela are o ramă de lemn și 16 movilițe de pământ, fiecare cu o plantă. Grâul crește des și se face auriu. Plantele sunt mari și se văd în 3D: căpățâni de varză cu frunze, roșii pe araci, porumb înalt cu știuleți, dovleci portocalii, vinete mov. Plantele trec prin patru etape: **semințe puse → răsaduri → cresc → gata de cules**. Lângă apă sau în raza unui turn de apă cresc mai repede. Legumele coapte se culeg singure și se plantează din nou. Fiecare pătrățel cules aduce **12 $**, iar la sfârșitul lunii suma apare în buget la „Legume vândute”. Cu 🔍 Info vezi ce legumă e pe un pătrățel și în ce etapă se află.

### Viața pe străzi

Pe drumuri circulă **mașini**, autoturisme și dubițe, cu geamuri, roți, faruri și stopuri. Merg pe banda din dreapta și virează lin. Pe **trotuare** se plimbă **oameni**. Cu cât orașul are mai mulți locuitori, cu atât apar mai multe mașini și mai mulți oameni.

### Cum arată orașul

- **Case** cu acoperiș în două ape sau în patru ape, ușă, coș de fum, gard alb în jurul curții, alee, tufe și uneori piscină.
- **Parcele mari:** când 4 pătrățele de locuințe alăturate (2×2) au case de nivel 1 sau 2, se unesc într-o singură parcelă mare. Pe ea stă o casă mare cu acoperiș în două ape (cu lucarne la nivelul 2), cu curte înconjurată de gard viu, alee, cutie poștală, flori, un cireș înflorit și, după caz, piscină gonflabilă cu umbrelă și șezlong, pătură de picnic cu trambulină, sau tufă tunsă ornamental cu grătar. Locuitorii se numără la fel ca înainte.
- **Vile** cu două etaje, balcon cu coloane și aripă laterală.
- **Blocuri** cu balcoane pe fiecare etaj, intrare cu copertină și uneori grădină pe acoperiș.
- **Magazine** cu vitrine, copertine colorate, firmă și umbrele cu mese. **Birourile și turnurile** au fâșii de sticlă.
- **Fabrici** cu acoperiș în dinți de fierăstrău și coșuri cu dungi roșii.
- **Curțile cu flori** au lalele, margarete, tufe de trandafiri și floarea-soarelui, toate cu tulpini.
- Camera pornește mai aproape, ca parcelele să se vadă mari, și te poți apropia de două ori mai mult decât înainte.
- Toate clădirile au **ferestre** și se întorc cu fața spre drum.
- Pe străzi: linie întreruptă, linii galbene pe margini, **treceri de pietoni** la intersecții, trotuare late din dale cărămizii, **stâlpi de iluminat**, bănci, coșuri de gunoi, **stații de autobuz** și copaci.
- **Magazinele** au pe acoperiș un obiect mare care arată ce vând: burger, coș cu fructe, floare, înghețată sau gogoașă.
- **Copacii** au coroane bogate din mai mulți bulgări de frunze, mai închise jos și mai deschise sus. Unii pomi au mere, portocale sau flori roz. Brazii au trei etaje de crengi.
- **Parcurile** au alei, o fântână sau o statuie, copaci rotunzi și bănci.
- Lângă apă, terenul liber devine **plajă cu nisip și palmieri**.
- Culorile sunt vii, ca în desenele animate.

### Incendii

Clădirile care nu sunt acoperite de o stație de pompieri pot lua foc din când în când. O clădire arsă revine la zonă goală și primești un mesaj pe ecran.

### Sfaturi automate

Jocul se uită la oraș și îți dă sfaturi, de exemplu „zonele nu au curent”, „nu ai apă” sau „bugetul e pe minus”.

---

## Controale

| Acțiune | Calculator | Telefon |
|---|---|---|
| Construiește | Click stânga (trage pentru drumuri și zone) | Un deget |
| Mută harta | Click dreapta + tragere, săgeți sau W A S D | Două degete (sau un deget cu 🔍 Info) |
| Zoom | Rotița mouse-ului, + / − | Ciupire cu două degete, butoanele ＋ / － |
| Rotește harta | Q / E | Butoanele ⟲ / ⟳ |
| Pauză | Spațiu | Butonul ⏸ |
| Unealta Info | Esc | Butonul 🔍 |

Timpul are patru viteze: **pauză, normal, rapid, foarte rapid**. La viteza normală, o zi durează 0,6 secunde.

---

## Salvare

Orașul se **salvează automat** în browser (localStorage) și se încarcă singur la următoarea deschidere. Din meniul ☰ poți începe un **oraș nou**, pe o hartă generată la întâmplare.

---

## Structura codului

```
city-builder/
├── index.html
├── package.json
├── vite.config.js        portul 5174, accesibil din rețea
└── src/
    ├── main.jsx          pornește React
    ├── App.jsx           interfața: bara de sus, unelte, buget, meniu, ferestre
    ├── styles.css        aspect, inclusiv pentru telefon
    └── game/
        ├── config.js     regulile: unelte, costuri, raze, niveluri
        ├── city.js       simularea: teren, creștere, cerere, buget, salvare
        ├── view.js       grafica 3D (three.js): teren, clădiri, mașini, cameră
        └── engine.js     leagă totul: mouse/atingere, bucla jocului, sfaturi
```

- **city.js** conține doar logica jocului, fără grafică. Poate fi testat separat.
- **view.js** desenează harta cu `InstancedMesh`, ca să meargă repede și pe telefon. Clădirile arată diferit în funcție de tip și de nivel, iar pe drumuri circulă mașini.
- **engine.js** transformă atingerile și click-urile în acțiuni. Rulează simularea după viteza aleasă și trimite starea către React.
