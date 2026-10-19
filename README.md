# Minicraft

Un joc în stilul Minecraft care rulează în browser, făcut cu React, Vite și three.js.

- `minicraft.html` – prima versiune, un singur fișier HTML.
- `minicraft-react/` – versiunea React, cu modurile Survival și Creative.

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
- **Modul Matematică:** fiecare bloc are un calcul scris pe el și îl spargi doar dacă răspunzi corect (niveluri: Fără, Ușor, Mediu, Greu)
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
