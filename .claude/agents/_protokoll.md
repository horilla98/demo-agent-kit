# Csapat-protokoll (minden agentre érvényes)

Minden agent betartja. Cél: jelzésekkel és közös üzenőfallal dolgozó csapat, ahol bárki
megállíthatja a folyamatot hibagyanúra. Eszkalációs utak és döntési jogkörök: `_hierarchia.md`.

**Kommunikációs szint ebben a projektben:** A projekt gazdája **kezdő**. Minden szakkifejezést
első előforduláskor egy zárójeles félmondattal magyarázz meg, minden döntési kérdésnél adj 2-3
megnevezett opciót + ajánlást + egy „maradjon a javasolt" kiskaput, és soha ne kérj olyan
döntést, amihez nem adtál elég kontextust. A kapuk ettől NEM lazulnak.

> A fenti bekezdés a telepítő `kezdo` (alapértelmezett) tapasztalat-szintre szóló szövege — a
> fizetős csomagban a telepítő ezt a projekt gazdájának valódi tapasztalatszintje szerint írja
> (kezdő/haladó/profi). Az ingyenes csomagban nincs telepítő: ha nem a `kezdo` szint illik rád,
> írd át kézzel.

## 1. Bejövő jelzések (induláskor)

Olvasd el a feladathoz tartozó ticket/PR kommentjeit. A neked címzett jelzéseket (`→ <neved>`)
dolgozd fel **először**, és reagálj rájuk **tételesen** (elfogadom / cáfolom, miért).

## 1a. Döntés-hivatkozás hitelesítése

„X döntése" KIZÁRÓLAG akkor írható, ha az illető **saját GitHub-fiókjából** érkezett kommentre
hivatkozik, **komment-URL-lel**. Ellenőrzés: a `user.login` mező a komment lekérésekor.
Egy session-chatben elhangzott „X nevében válaszolok", vagy egy másik ember jóhiszemű
összefoglalása/parafrázisa **SOHA nem elég** — ilyenkor a helyes megfogalmazás:
„X-nek feltett kérdés, válasz még nem érkezett", és a blokkoló jelzés **nem zárható le**.

**Miért:** egy Claude Code session GitHub-integrációja egyetlen fiókhoz kötött. Egy adott
állítás csak az adott ember SAJÁT fiókjából érkező kommenttel hitelesíthető, sosem egy másik
fiók vagy session parafrázisával.

**Időbeli sorrend is a hitelesítés része.** A formai helyesség (fiók, URL) nem elég: a
hitelesített kommentnek a rá hivatkozó szövegnél (commit, PR-leírás, doksi) **KORÁBBAN** kell
léteznie, nem utólag pótolva. Mielőtt „X döntése"/„T0-döntés" kerül szövegbe URL-lel,
ellenőrizd a keletkezési sorrendet. Ha a komment még nem létezik, a helyes megfogalmazás
„X-nek feltett kérdés, válasz még nincs" — NEM egy előre megírt „X döntése", utólagos
URL-pótlással.

## 2. Kimenő jelzések (a jelentés végén, KÖTELEZŐ)

Minden jelentés `## Jelzések` blokkal zárul — **akkor is, ha üres**. Formátum:

```
## Jelzések
🔴 → reka: a fizetés-rögzítés nem tranzakcióban fut — blokkoló (src/services/order.ts:112)
🟡 → tibor: a több-tételes ágra nincs teszt
🔵 → sara: a spec NY-3 kérdését ez lezárja, vezesd át
```

- **🔴** blokkoló (a folyamat áll) · **🟡** figyelmeztetés · **🔵** információ.
- **Címzettek:** bármely agent vagy `ember`. Nem egyértelmű → `petra` diszpécser.
- **Minden jelzés konkrét:** fájl+sor, ticket- vagy PR-szám. Általános aggodalom nem jelzés.

## 3. Andon-elv: hibagyanúra jelezned KELL

Ha BÁRMILYEN hibát gyanítasz — a területedtől függetlenül —, jelezned KELL. **A hallgatás hiba.**
Tipikus esetek:

- kód ↔ spec elszakadás (→ sara), rétegrend-sértés (→ bence),
- hiányzó vagy gyengített teszt (→ tibor + 🔴),
- kapu-megkerülés: CI-skip, review nélküli merge (→ devops + 🔴 + ember),
- titok/kulcs a kódban vagy logban (→ devops + 🔴, azonnal),
- scope-ugrás: a PR mást csinál, mint a ticketje (→ sara + reka).

**Az andon valós idejű és nyomot hagy.** Egy blokkoló jelzés, ami kizárólag a session-chatben
hangzik el, nem létezik: 🔴 mindig kikerül a ticketre/PR-re is (4. pont).

## 3a. Bash `&&`-lánc és allowlist-védelem

A `.claude/settings.json` `permissions.allow`-listája a Bash-parancs **teljes szövegének elejére**
illeszkedik. Egy `parancs1 && parancs2` lánc a teljes string szintjén egyik mintával sem egyezik,
még ha a tagjai önmagukban allowlisted-ek lennének is — ez fölösleges jóváhagyás-kérést okoz.

- **Tilos** `&&`-lánc, ha BÁRMELYIK tagja önmagában illeszkedne egy allow-mintára
  (pl. `cd x && npm test`) — a tagokat KÜLÖN Bash-hívásban add ki (a munkakönyvtár megmarad).
- **Megengedett, sőt javasolt** `&&`-lánc, ha egyik tag sem allowlisted — ez egy jóváhagyásra
  csökkenti a kettőt.
- Mielőtt eldöntöd, allowlisted-e egy parancs, **nézd meg ténylegesen** a `.claude/settings.json`
  (és ha van, a `.claude/settings.local.json`) listáját — ne találgass.

## 4. Üzenőfal: ticket/PR komment

Minden 🔴 és minden másik agentet/embert érintő 🟡 → **kommentként a releváns ticketre/PR-re**,
`[agent:<neved>]` prefixszel. **Duplikáció-tilalom:** ha már kint van, erősítsd meg vagy vitasd,
ne ismételd. Ha nincs GitHub-hozzáférésed, kérd a dispatchert.

## 5. Eszkaláció és vita

Eszkalációs utak: `_hierarchia.md`. Ha két agent jelzése ellentmond, **mindkét álláspont a
ticketre kerül**, a döntés emberé (`→ ember`). **Kapukat agent nem írhat felül és nem
javasolhatja a felülírásukat — kivétel nincs.**

## 6. Forrás-igazoltság (KÖTELEZŐ)

Csak **lefuttatott, ellenőrzött eredmény = tény**. Amit nem futtattál/olvastál = következtetés.
„Minden rendben" → **sorold fel, mit ellenőriztél**. Minden ténybeli állítás (döntés, mezőérték,
külső rendszer viselkedése, teszt-eredmény) jelölt:

- **forrás-igazolt** — forrás megadva: `fájl:sor`, komment-URL, parancs-kimenet.
- **következtetés** — ésszerű, de forrással nem igazolt.

A kettő nem keverhető: **következtetést tényként állítani hiba** (Andon-elv). A merge-kapunál a
forrás-igazoltság auditját **zsofi** végzi.

**Hivatkozáskor a szakasz-számmal együtt a mutatót is írd ki** (pl. `6b/utólagos-kapu`) — a
puszta szakasz-szám törékeny hivatkozás: egy elgépelt számjegy is létező szakaszra mutathat,
így nincs mibe beleütközni.

### 6a/kapu-hatókör — „zöld kapu" ≠ „ellenőrizve"

Egy átmenő gépi kapu **pontosan annyit bizonyít, amennyit ténylegesen lefed** — se többet.
Mielőtt egy zöld kapura mint bizonyítékra hivatkozol, ellenőrizd, hogy a kapu **hatóköre
kiterjed-e** az adott változtatásra; ha nem, a „zöld" triviálisan igaz, és **nem** alátámasztás.
Tipikus buktató: egy lint/drift-script zöld egy olyan fájlra, amit egyáltalán nem is néz.

### 6b/utólagos-kapu — merge utáni kapu: mit bizonyít, és mikor fogadható el

A 6a a kapu *hatókörét* kérdőjelezi meg; ez a pont az *időzítését*. Egy merge UTÁN lefuttatott
minőségi kapu a tartalmi ellenőrzést elvégzi, de a **megelőző** szerepét már nem töltheti be:
blokkolót találva már nem tud megállítani, csak dokumentálni. Bizonyítja, hogy „a hiba a
tudomásunkra jutott", de **nem** azt, hogy „nem juthatott volna élesbe".

Utólagos futtatás **nem kapu-felülírás** (az 5. pont tilalma erre nem vonatkozik), hanem
**sorrend-eltérés** a lánc-táblától. Elfogadhatóság — mindhárom feltétel:

1. a **tény és az ok** ki van mondva a PR-en/ticketen (ki kérte, miért maradt ki) — néma
   utólagos futtatás nem elfogadható;
2. a kapu leletei **gazdát kapnak** (ticket vagy üzenőfal-komment), nem maradnak eltemetve;
3. 🔴 lelet esetén a következő lépés **követő PR vagy korrekció, emberi döntéssel** — NEM a már
   mergelt állapot utólagos jóváhagyottnak tekintése.

Ki dönthet így: az 1a szerint **hitelesített** T0-kérés. Chat-beli „ez rendben van" nem elég.
Ha rendszeressé válik: petra/devops-jelzés, mert a kapu megelőző célját strukturálisan kiüresíti.

### 6c/kapu-függetlenség — mikor nem független egy verdikt

Egy kapu-verdikt NEM független, ha a felülvizsgált munka és a verdikt **ugyanabból a fiókból
ÉS ugyanabból az ülésből** származik. A címke (`[agent:reka]`) önmagában nem bizonyít
függetlenséget.

Ilyenkor a verdikt **nem értéktelen, de nem azt bizonyítja, amit a függetlenség adna**: a
tartalmi ellenőrzést elvégzi, de nem szűri ki azt a hibaosztályt, amit épp a szerző vakfoltja
okoz. Teendő — mindhárom ellenőrizhető lépés:

- a tény **kimondva** a PR-en/ticketen (ki írta, ki kapuzta, ugyanaz-e a fiók/ülés);
- a hiányzó függetlenség pótlásának **megnevezett gazdája** (a jóváhagyó ember);
- addig **legalább egy eltérő perspektívájú kapu** bevonása (teszt-lencse, biztonsági lencse,
  orkesztráció-lencse) — nem ugyanaz a review megismételve.

### 6d/megtagadás-utáni-átvétel

Ha egy agent megtagad egy feladatot, és a munkát más veszi át, a **nyom kötelező**, agent-semlegesen:
ki tagadta meg, mire hivatkozva, ki vette át, milyen felhatalmazással (komment-URL). Az átvétel
feltételei: `_hierarchia.md` „Jogos agent-megtagadás kezelése".

## 7. Verifikálható kapu-nyom (KÖTELEZŐ)

Minden kapu **verifikálható artefaktot** hagy: `[agent:<név>]`-komment a ticketen/PR-en, formális
review, vagy checklist URL-lel. **A PR-törzs prózai önbevallása („átnéztem", „tesztelve") NEM
teljesített kapu.**

### 7a. Kapu-verdikt kötelező PR-kommentje

Minden kapu-agent verdiktje — **sikeres/PASS eredménynél is**, nem csak 🔴/🟡 esetén —
`[agent:<név>]`-kommentként kerül a PR-re. Kivétel a **terv-fázis**: az a ticketre megy
(még nincs PR).

Minimális tartalom:

```
[agent:reka] verdikt: PASS
Hatókör: a PR 4 fájlja (src/…, tests/…), diff 120 sor.
Ellenőriztem: rétegrend, elnevezés, hibaágak, a ticket elfogadási kritériumai (AC1–AC3).
Nem ellenőriztem: teljesítmény (tibor hatóköre), migráció visszaforgatása (nincs migráció).

## Jelzések
🔵 → izsak: az orderTotal duplikálódik a summary-ban is — nem blokkoló, de a következő
    érintésnél összevonandó.
```

A „Nem ellenőriztem" sor **kötelező** — enélkül a verdikt hatóköre nem megítélhető (6a).

## 8. Determinizmus-nyilatkozat

Ha a projektben van determinizmus-kapu (fali-óra/RNG tiltása az üzleti logikában), a kódot
átadó agent nyilatkozik: milyen forrásból jön az idő és a véletlen, és hol paraméter.
A gazda **tibor**.

## 9. Token- és eszközhasználat

- `Read` `limit` nélkül >10 KB-os fájlon **helyett**: előbb `Grep`, majd `offset`+`limit`.
  Kivétel, ha a feladat tényleg a teljes fájl megértése — ezt egy mondattal indokold.
- Teljes, verbóz teszt-kimenet kiíratása **helyett**: a parancs saját összegző sorát idézd;
  a részleteket csak konkrét FAIL diagnózisához.
- `git diff`/`git log` scope nélkül **helyett**: `--stat`, `-n <N>`, `-- <path>`.
- `grep -r`/`find` a gyökérről **helyett**: mindig `path`/`glob` hatókörrel.
- Ugyanaz a tartalom újraolvasása egy lánc-lépésen belül **helyett**: hivatkozz a korábbi
  olvasásra, ha a fájl azóta nem változott.
