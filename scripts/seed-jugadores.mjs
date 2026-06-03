/**
 * Script para poblar la tabla jugadores.
 *
 * Modo 1 (sin API) — usa convocatoria curada con los jugadores más conocidos:
 *   node scripts/seed-jugadores.mjs
 *
 * Modo 2 (API completa) — fetch desde football-data.org (gratis en football-data.org):
 *   Añade a .env.local: FOOTBALL_DATA_TOKEN=tu_token
 *   node scripts/seed-jugadores.mjs --api
 */

import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'

// ── Cargar .env.local ─────────────────────────────────────────────────────────
const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter(l => l.trim() && !l.startsWith('#') && l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0,i).trim(), l.slice(i+1).trim()] })
)

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

// ── Mapa codigo_bandera → equipo_id (de nuestra DB) ──────────────────────────
const EQUIPO_ID = {
  mx:1, za:2, kr:3, cz:4, ca:5, ba:6, qa:7, ch:8, br:9, ma:10,
  ht:11, 'gb-sct':12, us:13, py:14, au:15, tr:16, de:17, cw:18,
  ci:19, ec:20, nl:21, jp:22, se:23, tn:24, be:25, eg:26, ir:27,
  nz:28, es:29, cv:30, sa:31, uy:32, fr:33, sn:34, iq:35, no:36,
  ar:37, dz:38, at:39, jo:40, pt:41, cd:42, uz:43, co:44,
  'gb-eng':45, hr:46, gh:47, pa:48,
}

// ── Convocatoria curada (8-10 jugadores por equipo) ───────────────────────────
// Formato: [nombre, apellidos, posicion, club]
// posicion: portero | defensa | centrocampista | delantero
const CURADA = {
  ar: [
    ['Emiliano','Martínez','portero','Aston Villa'],
    ['Nicolás','Otamendi','defensa','Benfica'],
    ['Nahuel','Molina','defensa','Atlético Madrid'],
    ['Alexis','Mac Allister','centrocampista','Liverpool'],
    ['Rodrigo','De Paul','centrocampista','Atlético Madrid'],
    ['Enzo','Fernández','centrocampista','Chelsea'],
    ['Lionel','Messi','delantero','Inter Miami'],
    ['Julián','Álvarez','delantero','Atlético Madrid'],
    ['Lautaro','Martínez','delantero','Inter'],
    ['Paulo','Dybala','delantero','Roma'],
  ],
  br: [
    ['Alisson','Becker','portero','Liverpool'],
    ['Ederson','Moraes','portero','Manchester City'],
    ['Marquinhos','Silva','defensa','PSG'],
    ['Danilo','Luiz','defensa','Juventus'],
    ['Gabriel','Magalhães','defensa','Arsenal'],
    ['Lucas','Paquetá','centrocampista','West Ham'],
    ['Rodrygo','Goes','delantero','Real Madrid'],
    ['Vinicius','Jr','delantero','Real Madrid'],
    ['Raphinha','Belloli','delantero','Barcelona'],
    ['Endrick','Felipe','delantero','Real Madrid'],
  ],
  fr: [
    ['Mike','Maignan','portero','AC Milan'],
    ['Theo','Hernández','defensa','AC Milan'],
    ['Dayot','Upamecano','defensa','Bayern Múnich'],
    ['Jules','Koundé','defensa','Barcelona'],
    ['Aurélien','Tchouaméni','centrocampista','Real Madrid'],
    ['Eduardo','Camavinga','centrocampista','Real Madrid'],
    ['N\'Golo','Kanté','centrocampista','Al-Ittihad'],
    ['Kylian','Mbappé','delantero','Real Madrid'],
    ['Antoine','Griezmann','delantero','Atlético Madrid'],
    ['Ousmane','Dembélé','delantero','PSG'],
  ],
  es: [
    ['Unai','Simón','portero','Athletic Club'],
    ['Dani','Carvajal','defensa','Real Madrid'],
    ['Robin','Le Normand','defensa','Real Sociedad'],
    ['Marc','Cucurella','defensa','Chelsea'],
    ['Alejandro','Grimaldo','defensa','Bayer Leverkusen'],
    ['Rodri','Hernández','centrocampista','Manchester City'],
    ['Pedri','González','centrocampista','Barcelona'],
    ['Fabián','Ruiz','centrocampista','PSG'],
    ['Dani','Olmo','centrocampista','Barcelona'],
    ['Lamine','Yamal','delantero','Barcelona'],
    ['Álvaro','Morata','delantero','AC Milan'],
    ['Mikel','Oyarzabal','delantero','Real Sociedad'],
  ],
  pt: [
    ['Diogo','Costa','portero','Porto'],
    ['Rúben','Dias','defensa','Manchester City'],
    ['João','Cancelo','defensa','Barcelona'],
    ['Nuno','Mendes','defensa','PSG'],
    ['Bruno','Fernandes','centrocampista','Manchester United'],
    ['Vitinha','Ferreira','centrocampista','PSG'],
    ['Bernardo','Silva','centrocampista','Manchester City'],
    ['Cristiano','Ronaldo','delantero','Al-Nassr'],
    ['Rafael','Leão','delantero','AC Milan'],
    ['Diogo','Jota','delantero','Liverpool'],
    ['João','Félix','delantero','Chelsea'],
  ],
  de: [
    ['Manuel','Neuer','portero','Bayern Múnich'],
    ['Antonio','Rüdiger','defensa','Real Madrid'],
    ['Joshua','Kimmich','centrocampista','Bayern Múnich'],
    ['İlkay','Gündogan','centrocampista','Barcelona'],
    ['Toni','Kroos','centrocampista','Real Madrid'],
    ['Florian','Wirtz','centrocampista','Bayer Leverkusen'],
    ['Leroy','Sané','delantero','Bayern Múnich'],
    ['Kai','Havertz','delantero','Arsenal'],
    ['Thomas','Müller','delantero','Bayern Múnich'],
    ['Niclas','Füllkrug','delantero','West Ham'],
  ],
  'gb-eng': [
    ['Jordan','Pickford','portero','Everton'],
    ['Kyle','Walker','defensa','Manchester City'],
    ['John','Stones','defensa','Manchester City'],
    ['Trent','Alexander-Arnold','centrocampista','Liverpool'],
    ['Declan','Rice','centrocampista','Arsenal'],
    ['Phil','Foden','centrocampista','Manchester City'],
    ['Jude','Bellingham','centrocampista','Real Madrid'],
    ['Bukayo','Saka','delantero','Arsenal'],
    ['Marcus','Rashford','delantero','Manchester United'],
    ['Harry','Kane','delantero','Bayern Múnich'],
  ],
  nl: [
    ['Mark','Flekken','portero','Brentford'],
    ['Virgil','van Dijk','defensa','Liverpool'],
    ['Nathan','Aké','defensa','Manchester City'],
    ['Denzel','Dumfries','defensa','Inter'],
    ['Frenkie','de Jong','centrocampista','Barcelona'],
    ['Tijjani','Reijnders','centrocampista','AC Milan'],
    ['Teun','Koopmeiners','centrocampista','Juventus'],
    ['Cody','Gakpo','delantero','Liverpool'],
    ['Memphis','Depay','delantero','Atlético Madrid'],
    ['Donyell','Malen','delantero','Borussia Dortmund'],
  ],
  be: [
    ['Thibaut','Courtois','portero','Real Madrid'],
    ['Jan','Vertonghen','defensa','Anderlecht'],
    ['Timothy','Castagne','defensa','Fulham'],
    ['Kevin','De Bruyne','centrocampista','Manchester City'],
    ['Yannick','Carrasco','centrocampista','Al-Qadsiah'],
    ['Amadou','Onana','centrocampista','Everton'],
    ['Romelu','Lukaku','delantero','Napoli'],
    ['Leandro','Trossard','delantero','Arsenal'],
    ['Dries','Mertens','delantero','Galatasaray'],
    ['Jeremy','Doku','delantero','Manchester City'],
  ],
  hr: [
    ['Dominik','Livaković','portero','Fenerbahce'],
    ['Josip','Juranović','defensa','Celtic'],
    ['Joško','Gvardiol','defensa','Manchester City'],
    ['Luka','Modrić','centrocampista','Real Madrid'],
    ['Mateo','Kovačić','centrocampista','Manchester City'],
    ['Marcelo','Brozović','centrocampista','Al-Nassr'],
    ['Ivan','Perišić','delantero','Hajduk Split'],
    ['Bruno','Petković','delantero','Dinamo Zagreb'],
    ['Ante','Budimir','delantero','Osasuna'],
  ],
  no: [
    ['Ørjan','Nyland','portero','Ipswich Town'],
    ['Stefan','Strandberg','defensa','Al-Ettifaq'],
    ['Leo','Skiri Østigård','defensa','Napoli'],
    ['Sander','Berge','centrocampista','Burnley'],
    ['Martin','Ødegaard','centrocampista','Arsenal'],
    ['Kristian','Thorstvedt','centrocampista','Sassuolo'],
    ['Erling','Haaland','delantero','Manchester City'],
    ['Alexander','Sørloth','delantero','Atlético Madrid'],
    ['Viktor','Gyökeres','delantero','Sporting CP'],
  ],
  uy: [
    ['Sergio','Rochet','portero','Inter'],
    ['Ronald','Araújo','defensa','Barcelona'],
    ['Mathías','Olivera','defensa','Napoli'],
    ['Rodrigo','Bentancur','centrocampista','Tottenham'],
    ['Federico','Valverde','centrocampista','Real Madrid'],
    ['Manuel','Ugarte','centrocampista','Manchester United'],
    ['Darwin','Núñez','delantero','Liverpool'],
    ['Luis','Suárez','delantero','Independiente'],
    ['Facundo','Pellistri','delantero','Manchester United'],
  ],
  co: [
    ['David','Ospina','portero','Al-Qadsiah'],
    ['Davinson','Sánchez','defensa','Galatasaray'],
    ['Daniel','Muñoz','defensa','Crystal Palace'],
    ['James','Rodríguez','centrocampista','Rayo Vallecano'],
    ['Richard','Ríos','centrocampista','Palmeiras'],
    ['Jefferson','Lerma','centrocampista','Crystal Palace'],
    ['Luis','Díaz','delantero','Liverpool'],
    ['Jhon','Córdoba','delantero','Krasnodar'],
    ['Rafael','Santos Borré','delantero','Eintracht Frankfurt'],
  ],
  ec: [
    ['Hernán','Galíndez','portero','Athletic Club'],
    ['Ángelo','Preciado','defensa','Genk'],
    ['Piero','Hincapié','defensa','Bayer Leverkusen'],
    ['Moisés','Caicedo','centrocampista','Chelsea'],
    ['Carlos','Gruezo','centrocampista','Augsburg'],
    ['Jeremy','Sarmiento','delantero','Brighton'],
    ['Enner','Valencia','delantero','Internacional'],
    ['Gonzalo','Plata','delantero','Sporting Lisboa'],
  ],
  ma: [
    ['Yassine','Bounou','portero','Al-Hilal'],
    ['Achraf','Hakimi','defensa','PSG'],
    ['Romain','Saïss','defensa','Besiktas'],
    ['Nayef','Aguerd','defensa','West Ham'],
    ['Sofyan','Amrabat','centrocampista','Manchester United'],
    ['Azzedine','Ounahi','centrocampista','Marseille'],
    ['Hakim','Ziyech','delantero','Galatasaray'],
    ['Youssef','En-Nesyri','delantero','Fenerbahce'],
    ['Abde','Ezzalzouli','delantero','Osasuna'],
  ],
  sn: [
    ['Édouard','Mendy','portero','Chelsea'],
    ['Kalidou','Koulibaly','defensa','Al-Hilal'],
    ['Formose','Mendy','defensa','Brest'],
    ['Idrissa','Gueye','centrocampista','Everton'],
    ['Pape','Matar Sarr','centrocampista','Tottenham'],
    ['Sadio','Mané','delantero','Al-Nassr'],
    ['Ismaïla','Sarr','delantero','Crystal Palace'],
    ['Nicolas','Jackson','delantero','Chelsea'],
    ['Habib','Diallo','delantero','Strasbourg'],
  ],
  gh: [
    ['Joseph','Wollacott','portero','Charlton Athletic'],
    ['Mohammed','Salisu','defensa','Monaco'],
    ['Denis','Odoi','defensa','Club Brugge'],
    ['Thomas','Partey','centrocampista','Arsenal'],
    ['André','Ayew','centrocampista','Le Havre'],
    ['Kudus','Mohammed','centrocampista','West Ham'],
    ['Jordan','Ayew','delantero','Nottingham Forest'],
    ['Antoine','Semenyo','delantero','Bournemouth'],
    ['Iñaki','Williams','delantero','Athletic Club'],
  ],
  ci: [
    ['Yahia','Fofana','portero','Leicester City'],
    ['Serge','Aurier','defensa','Sin club'],
    ['Jean-Louis','Touré','defensa','ASEC Mimosas'],
    ['Franck','Kessié','centrocampista','Al-Ahli'],
    ['Ibrahim','Sangaré','centrocampista','Nottingham Forest'],
    ['Sébastien','Haller','delantero','Borussia Dortmund'],
    ['Nicolas','Pépé','delantero','Sin club'],
    ['Wilfried','Zaha','delantero','Galatasaray'],
    ['Simon','Adingra','delantero','Brighton'],
  ],
  eg: [
    ['Mohamed','Elshenawy','portero','Al-Ahly'],
    ['Ahmed','Hegazi','defensa','Al-Ittihad'],
    ['Omar','Kamal','defensa','Zamalek'],
    ['Tarek','Hamed','centrocampista','Zamalek'],
    ['Trézéguet','Mahmoud','centrocampista','Sin club'],
    ['Mohamed','Salah','delantero','Liverpool'],
    ['Mostafa','Mohamed','delantero','Nantes'],
    ['Omar','Marmoush','delantero','Manchester City'],
  ],
  tn: [
    ['Aymen','Dahmen','portero','Stade de Reims'],
    ['Ali','Maaloul','defensa','Al-Ahly'],
    ['Dylan','Bronn','defensa','Salernitana'],
    ['Aïssa','Laïdouni','centrocampista','Union Berlin'],
    ['Hannibal','Mejbri','centrocampista','Sevilla'],
    ['Wahbi','Khazri','delantero','Montpellier'],
    ['Issam','Jebali','delantero','Norwich City'],
    ['Taha','Yassine Khenissi','delantero','Espérance'],
  ],
  dz: [
    ['Rais','M\'Bolhi','portero','Al-Ettifaq'],
    ['Youcef','Atal','defensa','Nice'],
    ['Aissa','Mandi','defensa','Villarreal'],
    ['Sofiane','Feghouli','centrocampista','Sin club'],
    ['Nabil','Bentaleb','centrocampista','Sin club'],
    ['Riyad','Mahrez','delantero','Al-Ahli'],
    ['Andy','Delort','delantero','Nantes'],
    ['Baghdad','Bounedjah','delantero','Al-Sadd'],
  ],
  jp: [
    ['Shuichi','Gonda','portero','Portimonense'],
    ['Takehiro','Tomiyasu','defensa','Arsenal'],
    ['Maya','Yoshida','defensa','Schaerbeek'],
    ['Hidemasa','Morita','centrocampista','Sporting Lisboa'],
    ['Wataru','Endo','centrocampista','Liverpool'],
    ['Daichi','Kamada','centrocampista','Crystal Palace'],
    ['Ritsu','Doan','delantero','Freiburg'],
    ['Kaoru','Mitoma','delantero','Brighton'],
    ['Takumi','Minamino','delantero','Monaco'],
    ['Ayase','Ueda','delantero','Feyenoord'],
  ],
  kr: [
    ['Kim','Seung-gyu','portero','Göztepe'],
    ['Kim','Min-jae','defensa','Bayern Múnich'],
    ['Lee','Kang-in','centrocampista','PSG'],
    ['Jung','Woo-young','centrocampista','Al-Qadsiah'],
    ['Son','Heung-min','delantero','Tottenham'],
    ['Cho','Gue-sung','delantero','Jeonbuk'],
    ['Hwang','Hee-chan','delantero','Wolverhampton'],
    ['Oh','Hyeon-gyu','delantero','Celtic'],
  ],
  au: [
    ['Mathew','Ryan','portero','AZ Alkmaar'],
    ['Miloš','Degenek','defensa','Columbus Crew'],
    ['Harry','Souttar','defensa','Leicester City'],
    ['Aaron','Mooy','centrocampista','Celtic'],
    ['Ajdin','Hrustic','centrocampista','Hellas Verona'],
    ['Martin','Boyle','delantero','Hibernian'],
    ['Mitchell','Duke','delantero','Fagiano Okayama'],
    ['Mathew','Leckie','delantero','Melbourne City'],
    ['Marco','Tilio','delantero','Melbourne City'],
  ],
  ir: [
    ['Alireza','Beiranvand','portero','Antwerp'],
    ['Ehsan','Hajsafi','defensa','AEK Atenas'],
    ['Majid','Hosseini','defensa','Kayserispor'],
    ['Saeid','Ezatolahi','centrocampista','Vejle'],
    ['Ali','Gholizadeh','centrocampista','Charleroi'],
    ['Mehdi','Taremi','delantero','Inter'],
    ['Sardar','Azmoun','delantero','Bayer Leverkusen'],
    ['Allahyar','Sayyadmanesh','delantero','Kasımpaşa'],
  ],
  us: [
    ['Matt','Turner','portero','Nottingham Forest'],
    ['Sergino','Dest','defensa','PSV'],
    ['Tim','Ream','defensa','Fulham'],
    ['Tyler','Adams','centrocampista','Bournemouth'],
    ['Weston','McKennie','centrocampista','Juventus'],
    ['Yunus','Musah','centrocampista','AC Milan'],
    ['Christian','Pulisic','delantero','AC Milan'],
    ['Giovanni','Reyna','delantero','Borussia Dortmund'],
    ['Ricardo','Pepi','delantero','PSV'],
    ['Folarin','Balogun','delantero','Monaco'],
  ],
  ca: [
    ['Milan','Borjan','portero','Red Star Belgrado'],
    ['Alistair','Johnston','defensa','Celtic'],
    ['Kamal','Miller','defensa','LAFC'],
    ['Alphonso','Davies','defensa','Bayern Múnich'],
    ['Stephen','Eustáquio','centrocampista','Porto'],
    ['Jonathan','Osorio','centrocampista','Toronto FC'],
    ['Tajon','Buchanan','delantero','Club Brugge'],
    ['Jonathan','David','delantero','Lille'],
    ['Cyle','Larin','delantero','Mallorca'],
  ],
  mx: [
    ['Guillermo','Ochoa','portero','América'],
    ['Edson','Álvarez','defensa','West Ham'],
    ['César','Montes','defensa','Monterrey'],
    ['Jorge','Sánchez','defensa','Ajax'],
    ['Luis','Chávez','centrocampista','Dinamo Moscú'],
    ['Héctor','Herrera','centrocampista','Houston Dynamo'],
    ['Santiago','Giménez','delantero','Feyenoord'],
    ['Hirving','Lozano','delantero','PSV'],
    ['Raúl','Jiménez','delantero','Fulham'],
  ],
  se: [
    ['Robin','Olsen','portero','Aston Villa'],
    ['Emil','Krafth','defensa','Newcastle'],
    ['Isak','Hien','defensa','Atalanta'],
    ['Albin','Ekdal','centrocampista','Sin club'],
    ['Dejan','Kulusevski','centrocampista','Tottenham'],
    ['Alexander','Isak','delantero','Newcastle'],
    ['Viktor','Gyökeres','delantero','Sporting CP'],
    ['Robin','Quaison','delantero','Sin club'],
  ],
  ch: [
    ['Yann','Sommer','portero','Inter'],
    ['Manuel','Akanji','defensa','Manchester City'],
    ['Fabian','Schär','defensa','Newcastle'],
    ['Granit','Xhaka','centrocampista','Bayer Leverkusen'],
    ['Remo','Freuler','centrocampista','Nottingham Forest'],
    ['Xherdan','Shaqiri','delantero','Chicago Fire'],
    ['Breel','Embolo','delantero','Monaco'],
    ['Ruben','Vargas','delantero','Augsburg'],
    ['Noah','Okafor','delantero','AC Milan'],
  ],
  at: [
    ['Patrick','Pentz','portero','Bayer Leverkusen'],
    ['Philipp','Lienhart','defensa','Freiburg'],
    ['Stefan','Posch','defensa','Bologna'],
    ['David','Alaba','defensa','Real Madrid'],
    ['Marcel','Sabitzer','centrocampista','Borussia Dortmund'],
    ['Konrad','Laimer','centrocampista','Bayern Múnich'],
    ['Marko','Arnautovic','delantero','Inter'],
    ['Michael','Gregoritsch','delantero','Freiburg'],
    ['Christoph','Baumgartner','delantero','RB Leipzig'],
  ],
  tr: [
    ['Mert','Günok','portero','Beşiktaş'],
    ['Zeki','Çelik','defensa','Roma'],
    ['Ozan','Kabak','defensa','Norwich City'],
    ['İsmail','Yüksek','centrocampista','Beşiktaş'],
    ['Hakan','Çalhanoğlu','centrocampista','Inter'],
    ['Salih','Özcan','centrocampista','Borussia Dortmund'],
    ['Arda','Güler','delantero','Real Madrid'],
    ['Kenan','Yıldız','delantero','Juventus'],
    ['Cenk','Tosun','delantero','Beşiktaş'],
  ],
  py: [
    ['Antony','Silva','portero','Olimpia'],
    ['Gustavo','Gómez','defensa','Palmeiras'],
    ['Fabián','Balbuena','defensa','Sin club'],
    ['Andrés','Cubas','centrocampista','Nantes'],
    ['Miguel','Almirón','centrocampista','Newcastle'],
    ['Richard','Sánchez','centrocampista','América'],
    ['Julio','Enciso','delantero','Brighton'],
    ['Roque','Santa Cruz','delantero','Sin club'],
  ],
  ba: [
    ['Kenan','Pirić','portero','Watford'],
    ['Sead','Kolašinac','defensa','Marseille'],
    ['Amar','Dedić','defensa','Salzburgo'],
    ['Miralem','Pjanić','centrocampista','Sin club'],
    ['Edin','Džeko','delantero','Fenerbahce'],
    ['Ermedin','Demirović','delantero','Augsburg'],
    ['Amer','Gojak','centrocampista','Fortuna Düsseldorf'],
    ['Kenan','Hodžić','delantero','Middlesbrough'],
  ],
  qa: [
    ['Meshaal','Barsham','portero','Al-Sadd'],
    ['Pedro','Miguel','defensa','Al-Duhail'],
    ['Bassam','Al-Rawi','defensa','Al-Gharafa'],
    ['Karim','Boudiaf','centrocampista','Al-Duhail'],
    ['Abdel Aziz','Hatem','centrocampista','Al-Rayyan'],
    ['Hassan','Al-Haydos','delantero','Al-Sadd'],
    ['Almoez','Ali','delantero','Al-Duhail'],
    ['Akram','Afif','delantero','Al-Sadd'],
  ],
  nz: [
    ['Oli','Sail','portero','Wellington Phoenix'],
    ['Winston','Reid','defensa','Reading'],
    ['Michael','Boxall','defensa','Minnesota United'],
    ['Liberato','Cacace','defensa','Empoli'],
    ['Alex','Greive','centrocampista','St Mirren'],
    ['Elijah','Just','centrocampista','Standard Lieja'],
    ['Chris','Wood','delantero','Nottingham Forest'],
    ['Marco','Rojas','delantero','Sin club'],
  ],
  cv: [
    ['Vozinha','Varela','portero','Estoril'],
    ['Stopira','Gomes','defensa','Sin club'],
    ['João','Virgil','defensa','Almería'],
    ['Kenny','Rocha','centrocampista','Basilea'],
    ['Ryan','Mendes','delantero','Sin club'],
    ['Garry','Rodrigues','delantero','Sin club'],
    ['Deroy','Duarte','delantero','Young Boys'],
    ['Djaniny','Tavares','delantero','Cruz Azul'],
  ],
  sa: [
    ['Mohammed','Al-Owais','portero','Al-Hilal'],
    ['Ali','Al-Bulayhi','defensa','Al-Hilal'],
    ['Hassan','Al-Tambakti','defensa','Al-Hilal'],
    ['Sami','Al-Najei','centrocampista','Al-Ahli'],
    ['Abdulellah','Al-Malki','centrocampista','Al-Ittihad'],
    ['Salem','Al-Dawsari','delantero','Al-Hilal'],
    ['Firas','Al-Buraikan','delantero','Al-Ahli'],
    ['Abdullah','Al-Hamdan','delantero','Al-Qadsiah'],
  ],
  iq: [
    ['Jalal','Hachim','portero','Al-Quwa Al-Jawiya'],
    ['Ali','Adnan','defensa','Udvartosi TE'],
    ['Rebin','Sulaka','defensa','Al-Zawra'],
    ['Amjad','Attwan','centrocampista','Al-Diwaniya'],
    ['Aymen','Hussein','delantero','Al-Shorta'],
    ['Ahmed','Yaas','delantero','Al-Zawra'],
    ['Mohanad','Ali','delantero','Al-Quwa Al-Jawiya'],
  ],
  jo: [
    ['Amer','Shafi','portero','Al-Faisaly'],
    ['Baha','Abdel Rahman','defensa','Al-Wehdat'],
    ['Ahmad','Saleh','defensa','Al-Ramtha'],
    ['Musa','Al-Taamari','centrocampista','Montpellier'],
    ['Yazan','Al-Naimat','centrocampista','Al-Faisaly'],
    ['Al-Hassan','Nawaf','delantero','Al-Ahli'],
  ],
  ht: [
    ['Josué','Duverger','portero','Deportivo Táchira'],
    ['Mechack','Jérôme','defensa','Colorado Rapids'],
    ['Zachary','Herivaux','defensa','Sin club'],
    ['Duckens','Nazon','delantero','Indy Eleven'],
    ['Dario','Sarmiento','delantero','Ferencváros'],
    ['Frantzdy','Pierrot','delantero','Saint-Étienne'],
  ],
  cw: [
    ['Eloy','Room','portero','FC Cincinnati'],
    ['Ethan','Sulkes','defensa','Beerschot'],
    ['Cuco','Martina','defensa','Sin club'],
    ['Leandro','Bacuna','centrocampista','Sin club'],
    ['Jarchinio','Antonia','centrocampista','Sin club'],
    ['Quentin','Mijnans','delantero','Sin club'],
    ['Jurriën','Timber','delantero','Arsenal'],
  ],
  cd: [
    ['Joël','Kiassumbua','portero','Zulte Waregem'],
    ['Chancel','Mbemba','defensa','Marseille'],
    ['Arthur','Masuaku','defensa','Besiktas'],
    ['Samuel','Moutoussamy','centrocampista','Toulouse'],
    ['Yannick','Bolasie','delantero','Sin club'],
    ['Cédric','Bakambu','delantero','Sin club'],
    ['Christian','Luyindama','defensa','Galatasaray'],
  ],
  uz: [
    ['Eldor','Shomurodov','delantero','Roma'],
    ['Jasur','Yakhshiboev','delantero','Kairat'],
    ['Odil','Ahmedov','centrocampista','FC Navbahor'],
    ['Otabek','Shukurov','centrocampista','Pakhtakor'],
    ['Jamshid','Iskanderov','portero','Pakhtakor'],
    ['Akramjon','Komilov','defensa','Pakhtakor'],
    ['Temur','Jumayev','defensa','Pakhtakor'],
  ],
  za: [
    ['Ronwen','Williams','portero','Mamelodi Sundowns'],
    ['Siyabonga','Ngezana','defensa','Kaizer Chiefs'],
    ['Bongani','Zungu','centrocampista','Mamelodi Sundowns'],
    ['Percy','Tau','delantero','Al-Ahly'],
    ['Themba','Zwane','delantero','Mamelodi Sundowns'],
    ['Evidence','Makgopa','delantero','Mamelodi Sundowns'],
    ['Lyle','Foster','delantero','Burnley'],
  ],
  cz: [
    ['Jiří','Pavlenka','portero','Werder Bremen'],
    ['Vladimír','Coufal','defensa','West Ham'],
    ['David','Zima','defensa','Torino'],
    ['Tomáš','Souček','centrocampista','West Ham'],
    ['Lukáš','Provod','centrocampista','Slavia Praha'],
    ['Ladislav','Krejčí','centrocampista','Bologna'],
    ['Patrik','Schick','delantero','Bayer Leverkusen'],
    ['Adam','Hložek','delantero','Bayer Leverkusen'],
  ],
  pa: [
    ['Luis','Mejía','portero','Sin club'],
    ['Fidel','Escobar','defensa','New England Revolution'],
    ['Édgar','Yoel Bárcenas','defensa','Sin club'],
    ['Adalberto','Carrasquilla','centrocampista','Salt Lake City'],
    ['Aníbal','Godoy','centrocampista','Nashville SC'],
    ['Rolando','Blackburn','delantero','Seattle Sounders'],
    ['Rodolfo','Pitti','delantero','Gent'],
    ['Roberto','Nurse','delantero','Sin club'],
  ],
  'gb-sct': [
    ['Angus','Gunn','portero','Norwich City'],
    ['Andrew','Robertson','defensa','Liverpool'],
    ['Kieran','Tierney','defensa','Real Sociedad'],
    ['Scott','McTominay','centrocampista','Napoli'],
    ['John','McGinn','centrocampista','Aston Villa'],
    ['Ryan','Christie','centrocampista','Bournemouth'],
    ['Lawrence','Shankland','delantero','Hearts'],
    ['Che','Adams','delantero','Southampton'],
  ],
}

// ── Utilidades ────────────────────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms))

function mapPosApi(pos) {
  return { Goalkeeper:'portero', Defence:'defensa', Midfield:'centrocampista', Offence:'delantero' }[pos] ?? 'centrocampista'
}

// ── MODO API: football-data.org ───────────────────────────────────────────────
async function seedFromApi(token) {
  console.log('🌐 Fetching WC 2026 teams from football-data.org...')
  const r = await fetch('https://api.football-data.org/v4/competitions/WC/teams?season=2026', {
    headers: { 'X-Auth-Token': token }
  })
  if (!r.ok) throw new Error(`teams endpoint: HTTP ${r.status}`)
  const { teams } = await r.json()
  console.log(`  → ${teams.length} equipos encontrados`)

  // Name → equipo_id mapping (football-data.org names)
  const NAME_MAP = {
    'Germany':17, 'Saudi Arabia':31, 'Algeria':38, 'Argentina':37, 'Australia':15,
    'Austria':39, 'Belgium':25, 'Bosnia and Herzegovina':6, 'Brazil':9, 'Cape Verde':30,
    'Canada':5, 'Colombia':44, 'Korea Republic':3, "Côte d'Ivoire":19, 'Croatia':46,
    'Curaçao':18, 'Ecuador':20, 'Egypt':26, 'Scotland':12, 'Spain':29,
    'USA':13, 'United States':13, 'France':33, 'Ghana':47, 'Haiti':11,
    'England':45, 'Iraq':35, 'Iran':27, 'Japan':22, 'Jordan':40,
    'Morocco':10, 'Mexico':1, 'Norway':36, 'New Zealand':28, 'Netherlands':21,
    'Panama':48, 'Paraguay':14, 'Portugal':41, 'Qatar':7,
    'Congo DR':42, 'DR Congo':42, 'Czech Republic':4, 'Czechia':4,
    'Senegal':34, 'South Africa':2, 'Sweden':23, 'Switzerland':8,
    'Tunisia':24, 'Turkey':16, 'Uruguay':32, 'Uzbekistan':43,
  }

  let total = 0
  for (let i = 0; i < teams.length; i++) {
    const team = teams[i]
    const equipoId = NAME_MAP[team.name]
    if (!equipoId) { console.warn(`  ⚠ Sin mapping: ${team.name}`); continue }

    await sleep(7000) // 10 req/min
    const tr = await fetch(`https://api.football-data.org/v4/teams/${team.id}`, {
      headers: { 'X-Auth-Token': token }
    })
    if (!tr.ok) { console.warn(`  ⚠ Error ${tr.status} para ${team.name}`); continue }
    const { squad } = await tr.json()
    if (!squad?.length) { console.warn(`  ⚠ Sin plantilla para ${team.name}`); continue }

    const jugadores = squad.map(p => {
      const parts = (p.name || '').split(' ')
      return {
        equipo_id: equipoId,
        nombre: parts[0] ?? p.name,
        apellidos: parts.slice(1).join(' ') || parts[0],
        posicion: mapPosApi(p.position),
        fecha_nacimiento: p.dateOfBirth ? p.dateOfBirth.slice(0,10) : null,
        club: null,
        es_capitan: false,
      }
    })
    const { error } = await supabase.from('jugadores').insert(jugadores)
    if (error) console.error(`  ✗ ${team.name}:`, error.message)
    else { console.log(`  ✓ ${team.name}: ${jugadores.length} jugadores`); total += jugadores.length }
  }
  console.log(`\n✅ API seed completo: ${total} jugadores insertados`)
}

// ── MODO CURADO (fallback) ────────────────────────────────────────────────────
async function seedCurado() {
  console.log('📋 Usando convocatoria curada...')
  // Obtener equipo_id por codigo_bandera
  const { data: equipos, error } = await supabase.from('equipos').select('id, codigo_bandera')
  if (error) throw error

  const bandToId = Object.fromEntries(equipos.map(e => [e.codigo_bandera, e.id]))
  let total = 0

  for (const [codigo, jugadores] of Object.entries(CURADA)) {
    const equipoId = EQUIPO_ID[codigo] ?? bandToId[codigo]
    if (!equipoId) { console.warn(`  ⚠ Sin equipo para ${codigo}`); continue }

    const rows = jugadores.map(([nombre, apellidos, posicion, club]) => ({
      equipo_id: equipoId, nombre, apellidos, posicion, club, es_capitan: false,
    }))
    const { error } = await supabase.from('jugadores').insert(rows)
    if (error) console.error(`  ✗ ${codigo}:`, error.message)
    else { console.log(`  ✓ ${codigo}: ${rows.length} jugadores`); total += rows.length }
  }
  console.log(`\n✅ Seed curado completo: ${total} jugadores insertados`)
}

// ── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  const useApi = process.argv.includes('--api')
  const token = env.FOOTBALL_DATA_TOKEN

  // Limpiar tabla antes de reinsertar
  console.log('🗑 Limpiando tabla jugadores...')
  await supabase.from('jugadores').delete().gt('id', 0)

  if (useApi && token) {
    await seedFromApi(token)
  } else {
    if (useApi && !token) console.warn('⚠ --api sin FOOTBALL_DATA_TOKEN en .env.local, usando curada')
    await seedCurado()
  }
}

main().catch(e => { console.error(e); process.exit(1) })
