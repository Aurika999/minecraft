# Minicraft

Un joc în stilul Minecraft care rulează în browser, făcut cu React, Vite și three.js.

- `minicraft.html` – prima versiune, un singur fișier HTML.
- `minicraft-react/` – versiunea React, cu modurile Survival și Creative.
- `city-builder/` – **Orașul Meu**, un joc separat de construit orașe (în stilul SimCity), cu React și three.js.

## Pornire

```
cd minicraft-react
npm install
npm run dev
```

Apoi deschide http://localhost:5173/.

## Ce conține

- Lume generată cu dealuri, copaci, peșteri, lavă și minereuri (cărbune, fier, diamant)
- Survival: viață, foame, daune din cădere și lavă, unelte care se uzează
- Creative: zbor, blocuri nelimitate, spargere instantanee
- Crafting din inventar, pe bancul de lucru și în cuptor
- Animale (vaci, porci, oi, găini) și monștri noaptea (zombi, schelete, creeperi)
- Ciclu zi/noapte, torțe care luminează, pat pentru dormit și punct de renaștere
- Se poate juca și pe telefon sau tabletă, cu controale tactile

## Controale

| Tastă | Acțiune |
| --- | --- |
| W A S D | mișcare |
| Spațiu | săritură (de 2 ori rapid în Creative = zbor) |
| Shift | ghemuire / coborâre în zbor |
| Ctrl sau W de 2 ori | alergare |
| Click stânga (ține) | sparge blocuri / lovește |
| Click dreapta | pune bloc / folosește / mănâncă |
| E | inventar și crafting |
| Q | aruncă obiectul |
| 1–9 / rotița | alege din bară |
| F3 | coordonate și informații |

### Pe telefon

| Gest | Acțiune |
| --- | --- |
| Joystick stânga | mișcare (împins până la capăt = alergare) |
| Tragi cu degetul | te uiți în jur |
| Atingere scurtă | pune bloc / folosește / lovește |
| Ții apăsat | sparge blocul |
| ▲ / ▼ | săritură / ghemuire |

Ca să încerci pe telefon în aceeași rețea Wi-Fi, rulează `npm run dev` și deschide adresa „Network” afișată în terminal.

## Orașul Meu (city-builder)

```
cd city-builder
npm install
npm run dev
```

Apoi deschide http://localhost:5174/.

Construiești drumuri, zone de locuințe, comerț și industrie, centrale, turnuri de apă, parcuri și servicii (poliție, pompieri, școli). Clădirile cresc singure când au drum, curent și apă. Ai buget lunar cu taxe și întreținere, poluare, incendii și mașini pe drumuri. Orașul se salvează automat în browser. Se joacă și pe telefon: un deget construiește, două degete mută harta și fac zoom.
