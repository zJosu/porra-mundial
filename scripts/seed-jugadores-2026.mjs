/**
 * Seed oficial — Convocatorias Mundial 2026 (fuente: ESPN, 1-2 jun 2026).
 *
 * Uso:
 *   node scripts/seed-jugadores-2026.mjs
 *
 * Comportamiento:
 *   1) DELETE FROM jugadores  (borra todo)
 *   2) INSERT lista oficial completa (~1.200 jugadores)
 */

import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'

// ── .env.local ───────────────────────────────────────────────────────────────
const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter(l => l.trim() && !l.startsWith('#') && l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

// ── codigo_bandera → equipo_id ───────────────────────────────────────────────
const EQUIPO_ID = {
  mx: 1, za: 2, kr: 3, cz: 4, ca: 5, ba: 6, qa: 7, ch: 8, br: 9, ma: 10,
  ht: 11, 'gb-sct': 12, us: 13, py: 14, au: 15, tr: 16, de: 17, cw: 18,
  ci: 19, ec: 20, nl: 21, jp: 22, se: 23, tn: 24, be: 25, eg: 26, ir: 27,
  nz: 28, es: 29, cv: 30, sa: 31, uy: 32, fr: 33, sn: 34, iq: 35, no: 36,
  ar: 37, dz: 38, at: 39, jo: 40, pt: 41, cd: 42, uz: 43, co: 44,
  'gb-eng': 45, hr: 46, gh: 47, pa: 48,
}

// ── Convocatorias oficiales ──────────────────────────────────────────────────
// Cada entrada: "Nombre Completo (Club)"
const SQUADS = {
  // ── Grupo A ───────────────────────────────────────────────────────────────
  mx: {
    gk: ['Carlos Acevedo (Santos Laguna)', 'Guillermo Ochoa (AEL Limassol)', 'Raúl Rangel (Chivas)'],
    df: ['César Montes (Lokomotiv Moscow)', 'Edson Álvarez (Fenerbahçe)', 'Israel Reyes (América)', 'Jesús Gallardo (Toluca)', 'Johan Vásquez (Genoa)', 'Jorge Sánchez (PAOK)', 'Mateo Chávez (AZ Alkmaar)'],
    mf: ['Álvaro Fidalgo (Real Betis)', 'Brian Gutiérrez (Chivas)', 'Erik Lira (Cruz Azul)', 'Gilberto Mora (Tijuana)', 'Luis Chávez (Dinamo Moscú)', 'Luis Romo (Chivas)', 'Obed Vargas (Atlético de Madrid)', 'Orbelín Pineda (AEK)'],
    fw: ['Alexis Vega (Toluca)', 'Armando González (Chivas)', 'César Huerta (Anderlecht)', 'Guillermo Martínez (Pumas)', 'Julián Quiñones (Al-Qadisiyah)', 'Raúl Jiménez (Fulham)', 'Roberto Alvarado (Chivas)', 'Santiago Giménez (Milan)'],
  },
  za: {
    gk: ['Ronwen Williams (Mamelodi Sundowns)', 'Ricardo Goss (Siwelele FC)', 'Sipho Chaine (Orlando Pirates)'],
    df: ['Khuliso Mudau (Mamelodi Sundowns)', 'Olwethu Makhanya (Philadelphia Union)', 'Bradley Cross (Kaizer Chiefs)', 'Thabang Matuludi (Polokwane City)', 'Knosinathi Sibisi (Orlando Pirates)', 'Aubrey Modiba (Mamelodi Sundowns)', 'Khulumani Ndamane (Mamelodi Sundowns)', 'Ime Okon (Hannover 96)', 'Samukele Kabini (Molde FK)', 'Mbekezeli Mbokazi (Chicago Fire)'],
    mf: ['Teboho Mokoena (Mamelodi Sundowns)', 'Jayden Adams (Mamelodi Sundowns)', 'Thalente Mbatha (Orlando Pirates)', 'Sphephelo Sithole (CD Tondela)'],
    fw: ['Oswin Appollis (Orlando Pirates)', 'Tshepang Moremi (Orlando Pirates)', 'Evidence Makgopa (Orlando Pirates)', 'Lyle Foster (Burnley)', 'Iqraam Rayners (Mamelodi Sundowns)', 'Relebohile Mokofoeng (Orlando Pirates)', 'Themba Zwane (Mamelodi Sundowns)', 'Kamogelo Sebelebele (Orlando Pirates)', 'Thapelo Maseko (AEL Limassol)'],
  },
  kr: {
    gk: ['Jo Hyun-Woo (Ulsan HD)', 'Kim Seung-Gyu (FC Tokyo)', 'Song Bum-Keun (Jeonbuk Hyundai)'],
    df: ['Kim Min-Jae (Bayern Munich)', 'Jo Yu-Min (Sharjah)', 'Lee Han-Beom (Midtjylland)', 'Kim Tae-Hyun (Kashima Antlers)', 'Park Jin-Seop (Zhejiang FC)', 'Lee Ki-Hyeok (Gangwon FC)', 'Lee Tae-Seok (Austria Vienna)', 'Seol Young-Woo (Red Star Belgrade)', 'Jens Castrop (Borussia Mönchengladbach)', 'Kim Moon-Hwan (Daejeon Hana)'],
    mf: ['Yang Hyun-Jun (Celtic)', 'Paik Seung-Ho (Birmingham City)', 'Hwang In-Beom (Feyenoord)', 'Kim Jin-Kyu (Jeonbuk Hyundai)', 'Bae Jun-Ho (Stoke City)', 'Um Ji-Sung (Swansea City)', 'Hwang Hee-Chan (Wolverhampton)', 'Lee Dong-Gyeong (Ulsan HD)', 'Lee Jae-Sung (Mainz)', 'Lee Kang-In (Paris Saint-Germain)'],
    fw: ['Oh Hyun-Kyu (Besiktas)', 'Son Heung-Min (LAFC)', 'Cho Kyu-Sung (Midtjylland)'],
  },
  cz: {
    gk: ['Lukás Hornícek (Braga)', 'Matej Kovár (PSV Eindhoven)', 'Jindrich Stanek (Slavia Prague)'],
    df: ['Vladimír Coufal (Hoffenheim)', 'David Doudera (Slavia Prague)', 'Tomás Holes (Slavia Prague)', 'Robin Hranác (Hoffenheim)', 'Stepán Chaloupek (Slavia Prague)', 'David Jurásek (Slavia Prague)', 'Ladislav Krejcí (Wolverhampton)', 'Jaroslav Zeleny (Sparta Prague)', 'David Zima (Slavia Prague)'],
    mf: ['Lukás Cerv (Viktoria Plzen)', 'Vladimír Darida (Hradec Králové)', 'Lukás Provod (Slavia Prague)', 'Michal Sadílek (Slavia Prague)', 'Hugo Sochurek (Sparta Prague)', 'Alexandr Sojka (Viktoria Plzen)', 'Tomás Soucek (West Ham)', 'Pavel Sulc (Lyon)', 'Denis Visinsky (Viktoria Plzen)'],
    fw: ['Tomás Chory (Slavia Prague)', 'Adam Hlozek (Hoffenheim)', 'Mojmír Chytil (Slavia Prague)', 'Jan Kuchta (Sparta Prague)', 'Patrik Schick (Bayer Leverkusen)'],
  },

  // ── Grupo B ───────────────────────────────────────────────────────────────
  ca: {
    gk: ['Maxime Crépeau (Orlando City SC)', 'Owen Goodman (Barnsley FC)', 'Dayne St. Clair (Inter Miami FC)'],
    df: ['Moïse Bombito (OGC Nice)', 'Derek Cornelius (Olympique de Marseille)', 'Alphonso Davies (Bayern Munich)', 'Luc de Fougerolles (Fulham FC)', 'Alistair Johnston (Celtic FC)', 'Alfie Jones (Middlesbrough FC)', 'Richie Laryea (Toronto FC)', 'Niko Sigur (Hajduk Split)', 'Joel Waterman (Chicago Fire FC)'],
    mf: ['Ali Ahmed (Norwich City FC)', 'Tajon Buchanan (Villarreal CF)', 'Mathieu Choinière (LAFC)', 'Stephen Eustáquio (FC Porto)', 'Marcelo Flores (Tigres UANL)', 'Ismaël Koné (Sassuolo)', 'Liam Millar (Hull City FC)', 'Jonathan Osorio (Toronto FC)', 'Nathan Saliba (R.S.C. Anderlecht)', 'Jacob Shaffelburg (LAFC)'],
    fw: ['Jonathan David (Juventus FC)', 'Promise David (Royale Union Saint-Gilloise)', 'Cyle Larin (RCD Mallorca)', 'Tani Oluwaseyi (Villarreal CF)'],
  },
  ba: {
    gk: ['Nikola Vasilj (St Pauli)', 'Martin Zlomislic (Rijeka)', 'Osman Hadzikic (Slaven Belupo)'],
    df: ['Sead Kolasinac (Atalanta)', 'Amar Dedic (Benfica)', 'Nihad Mujakic (Gaziantep)', 'Nikola Katic (Schalke 04)', 'Tarik Muharemovic (Sassuolo)', 'Stjepan Radeljic (Rijeka)', 'Dennis Hadzikadunic (Sampdoria)', 'Nidal Celik (Lens)'],
    mf: ['Amir Hadziahmetovic (Hull City)', 'Ivan Sunjic (Pafos)', 'Ivan Basic (Astana)', 'Dzenis Burnic (Karlsruher SC)', 'Ermin Mahmic (Slovan Liberec)', 'Benjamin Tahirovic (Brondby)', 'Amar Memic (Viktoria Plzen)', 'Armin Gigovic (Young Boys)', 'Kerim Alajbegovic (RB Salzburg)', 'Esmir Bajraktarevic (PSV Eindhoven)'],
    fw: ['Ermedin Demirovic (VfB Stuttgart)', 'Jovo Lukic (Universitatea Cluj)', 'Samed Bazdar (Jagiellonia Bialystok)', 'Haris Tabakovic (Borussia Mönchengladbach)', 'Edin Dzeko (Schalke 04)'],
  },
  qa: {
    gk: ['Salah Zakaria (Al Duhail)', 'Meshaal Barsham (Al Sadd)', 'Mahmoud Abunada (Al Rayyan)'],
    df: ['Pedro Miguel (Al Sadd)', 'Sultan Al Brake (Al Duhail)', 'Al-Hashmi Al-Hussain (Al Arabi)', 'Ayoub Al-Alawi (Al Gharafa)', 'Issa Laye (Al Arabi)', 'Lucas Mendes (Al Wakrah)', 'Mohammed Waad (Al Shamal)', 'Niall Mason (Qatar SC)'],
    mf: ['Ahmed Fathi (Al Arabi)', 'Jassim Gaber (Al Rayyan)', 'Assim Madibo (Al Wakrah)', 'Abdulaziz Hatem (Al Rayyan)', 'Karim Boudiaf (Al Duhail)', 'Mohammed Mannai (Al Shamal)'],
    fw: ['Almoez Ali (Al Duhail)', 'Akram Afif (Al Sadd)', 'Tahsin Mohammed (Al Duhail)', 'Edmílson Junior (Al Duhail)', 'Ahmed Alaa (Al Rayyan)', 'Hassan Al-Haydos (Al Sadd)', 'Mubarak Shannan (Al Duhail)', 'Mohammed Muntari (Al Gharafa)', 'Yusuf Abdurisag (Al Wakrah)'],
  },
  ch: {
    gk: ['Gregor Kobel (Borussia Dortmund)', 'Yvon Mvogo (Lorient)', 'Marvin Keller (Young Boys)'],
    df: ['Manuel Akanji (Inter Milan)', 'Nico Elvedi (Borussia Mönchengladbach)', 'Ricardo Rodríguez (Real Betis)', 'Silvan Widmer (Mainz)', 'Miro Muheim (Hamburger SV)', 'Aurèle Amenda (Eintracht Frankfurt)', 'Eray Cömert (Valencia)', 'Luca Jaquez (Stuttgart)'],
    mf: ['Granit Xhaka (Sunderland)', 'Johan Manzambi (Freiburg)', 'Remo Freuler (Bologna)', 'Denis Zakaria (Monaco)', 'Ardon Jashari (AC Milan)', 'Djibril Sow (Sevilla)', 'Christian Fassnacht (Young Boys)', 'Michel Aebischer (Pisa)', 'Fabian Rieder (Augsburg)', 'Rubén Vargas (Sevilla)'],
    fw: ['Breel Embolo (Rennes)', 'Noah Okafor (Leeds)', 'Dan Ndoye (Nottingham Forest)', 'Zeki Amdouni (Burnley)', 'Cedric Itten (Fortuna Düsseldorf)'],
  },

  // ── Grupo C ───────────────────────────────────────────────────────────────
  br: {
    gk: ['Alisson (Liverpool)', 'Éderson (Fenerbahçe)', 'Weverton (Grêmio)'],
    df: ['Alex Sandro (Flamengo)', 'Bremer (Juventus)', 'Danilo (Flamengo)', 'Douglas Santos (Zenit St. Petersburg)', 'Gabriel Magalhães (Arsenal)', 'Léo Pereira (Flamengo)', 'Marquinhos (Paris Saint-Germain)', 'Roger Ibañez (Al Ahli)', 'Wesley (AS Roma)'],
    mf: ['Bruno Guimarães (Newcastle United)', 'Casemiro (Manchester United)', 'Danilo Santos (Botafogo)', 'Fabinho (Al Ittihad)', 'Lucas Paquetá (Flamengo)'],
    fw: ['Endrick (Lyon)', 'Gabriel Martinelli (Arsenal)', 'Igor Thiago (Brentford)', 'Luiz Henrique (Zenit St. Petersburg)', 'Matheus Cunha (Manchester United)', 'Neymar (Santos)', 'Raphinha (Barcelona)', 'Rayan (Bournemouth)', 'Vinícius Júnior (Real Madrid)'],
  },
  ma: {
    gk: ['Yassine Bounou (Al-Hilal)', 'Munir Kajoui (Renaissance de Berkane)', 'Ahmed Reda Tagnaouti (FAR Rabat)'],
    df: ['Achraf Hakimi (PSG)', 'Noussair Mazraoui (Manchester United)', 'Anass Salah-Eddine (PSV Eindhoven)', 'Youssef Belammari (Al Ahly SC)', 'Issa Diop (Fulham)', 'Chadi Riad (Crystal Palace)', 'Zakaria El Ouahdi (KRC Genk)', 'Redouane Halhal (Mechelen)', 'Nayef Aguerd (OM)'],
    mf: ['Neil El Aynaoui (Roma)', 'Azzedine Ounahi (Girona)', 'Ismael Saibari (PSV Eindhoven)', 'Bilal El Khannouss (Stuttgart)', 'Samir El Mourabet (Strasbourg)', 'Sofyan Amrabat (Betis)', 'Ayyoub Bouaddi (Lille)'],
    fw: ['Brahim Díaz (Real Madrid)', 'Ayoub El Kaabi (Olympiakos)', 'Abde Ezzalzouli (Betis)', 'Soufiane Rahimi (Al-Ain)', 'Gessime Yassine (Strasbourg)', 'Ayoube Amaimouni (Eintracht Frankfurt)', 'Chemsdine Talbi (Sunderland)'],
  },
  ht: {
    gk: ['Johny Placide (Bastia)', 'Alexandre Pierre (Sochaux)', 'Josue Duverger (Cosmos Koblenz)'],
    df: ['Carlens Arcus (Angers)', 'Wilguens Paugain (Zulte Waregem)', 'Duke Lacroix (Colorado Springs Switchbacks)', 'Martin Expérience (Nancy)', 'Jean-Kévin Duverne (Gent)', 'Ricardo Adé (LDU Quito)', 'Hannes Delcroix (Lugano)', 'Keeto Thermoncy (Young Boys)'],
    mf: ['Carl Fred Sainté (El Paso Locomotive)', 'Leverton Pierre (Vizela)', 'Danley Jean Jacques (Philadelphia Union)', 'Jean-Ricner Bellegarde (Wolverhampton Wanderers)', 'Woodensky Pierre (Violette)', 'Dominique Simon (FC Tatran Prešov)'],
    fw: ['Don Deedson Louicius (FC Dallas)', 'Josué Casimir (Auxerre)', 'Derrick Etienne (Toronto FC)', 'Ruben Providence (Almere)', 'Duckens Nazon (Esteghlal)', 'Frantzdy Pierrot (Çaykur Rizespor)', 'Wilson Isidor (Sunderland)', 'Yassin Fortuné (Vizela)', 'Lenny Joseph (Ferencváros)'],
  },
  'gb-sct': {
    gk: ['Craig Gordon (Hearts)', 'Angus Gunn (Nottingham Forest)', 'Liam Kelly (Rangers)'],
    df: ['Grant Hanley (Hibernian)', 'Jack Hendry (Al Ettifaq)', 'Aaron Hickey (Brentford)', 'Dom Hyam (Wrexham)', 'Scott McKenna (Dinamo Zagreb)', 'Nathan Patterson (Everton)', 'Anthony Ralston (Celtic)', 'Andy Robertson (Liverpool)', 'John Souttar (Rangers)', 'Kieran Tierney (Celtic)'],
    mf: ['Ryan Christie (Bournemouth)', 'Finlay Curtis (Kilmarnock)', 'Lewis Ferguson (Bologna)', 'Ben Gannon-Doak (Bournemouth)', 'Billy Gilmour (Napoli)', 'John McGinn (Aston Villa)', 'Kenny McLean (Norwich)', 'Scott McTominay (Napoli)'],
    fw: ['Ché Adams (Torino)', 'Lyndon Dykes (Charlton Athletic)', 'George Hirst (Ipswich)', 'Lawrence Shankland (Hearts)', 'Ross Stewart (Southampton)'],
  },

  // ── Grupo D ───────────────────────────────────────────────────────────────
  us: {
    gk: ['Matt Freese (New York City)', 'Matt Turner (New England Revolution)', 'Chris Brady (Chicago Fire)'],
    df: ['Max Arfsten (Columbus Crew)', 'Sergiño Dest (PSV)', 'Alex Freeman (Villarreal)', 'Mark McKenzie (Toulouse)', 'Tim Ream (Charlotte FC)', 'Chris Richards (Crystal Palace)', 'Antonee Robinson (Fulham)', 'Miles Robinson (FC Cincinnati)', 'Joe Scally (Borussia Mönchengladbach)', 'Auston Trusty (Celtic)'],
    mf: ['Tyler Adams (AFC Bournemouth)', 'Sebastian Berhalter (Vancouver Whitecaps)', 'Weston McKennie (Juventus)', 'Cristian Roldan (Seattle Sounders)', 'Brenden Aaronson (Leeds United)', 'Christian Pulisic (AC Milan)', 'Gio Reyna (Borussia Mönchengladbach)', 'Malik Tillman (Bayer Leverkusen)', 'Tim Weah (Marseille)', 'Alejandro Zendejas (Club América)'],
    fw: ['Folarin Balogun (AS Monaco)', 'Ricardo Pepi (PSV Eindhoven)', 'Haji Wright (Coventry City)'],
  },
  py: {
    gk: ['Roberto Fernández (Cerro Porteño)', 'Orlando Gill (San Lorenzo)', 'Gastón Olveira (Olimpia)'],
    df: ['Gustavo Gómez (Palmeiras)', 'Juan Cáceres (Dynamo Moscow)', 'Gustavo Velázquez (Cerro Porteño)', 'Júnior Alonso (Atlético Mineiro)', 'Jose Canale (Lanús)', 'Omar Alderete (Sunderland)', 'Alexandro Maidana (Talleres)', 'Fabián Balbuena (Grêmio)'],
    mf: ['Diego Gómez (Brighton & Hove Albion)', 'Mauricio Magalhães (Palmeiras)', 'Damián Bobadilla (Sao Paulo)', 'Braian Ojeda (Orlando City)', 'Andrés Cubas (Vancouver Whitecaps)', 'Matías Galarza (Atlanta United)', "Alejandro Romero Gamarra 'Kaku' (Al Ain)"],
    fw: ['Gustavo Caballero (Portsmouth)', 'Ramón Sosa (Palmeiras)', 'Alex Arce (Independiente Rivadavia)', 'Isidro Pitta (Red Bull Bragantino)', 'Gabriel Ávalos (Independiente)', 'Miguel Almirón (Atlanta United)', 'Julio Enciso (Strasbourg)', 'Antonio Sanabria (Cremonese)'],
  },
  au: {
    gk: ['Patrick Beach (Melbourne City)', 'Paul Izzo (Randers FC)', 'Mathew Ryan (Levante UD)'],
    df: ['Aziz Behich (Melbourne City)', 'Jordan Bos (Feyenoord)', 'Cameron Burgess (Swansea City)', 'Alessandro Circati (Parma Calcio 1913)', 'Milos Degenek (Apoel FC)', 'Jason Geria (Albirex Niigata)', 'Lucas Herrington (Colorado Rapids)', 'Jacob Italiano (Grazer AK)', 'Harry Souttar (Leicester City)', 'Kai Trewin (New York City)'],
    mf: ['Cameron Devlin (Hearts)', 'Ajdin Hrustic (Heracles Almelo)', 'Jackson Irvine (St Pauli)', 'Connor Metcalfe (St Pauli FC)', "Aiden O'Neill (New York City)", 'Paul Okon-Engstler (Sydney FC)'],
    fw: ['Nestory Irankunda (Watford)', 'Mathew Leckie (Melbourne City)', 'Awer Mabil (CD Castellón)', 'Mohamed Toure (Norwich City)', 'Nishan Velupillay (Melbourne Victory)', 'Cristian Volpato (Sassuolo)', 'Tete Yengi (Machida Zelvia)'],
  },
  tr: {
    gk: ['Altay Bayindir (Manchester United)', 'Ersin Destanoglu (Besiktas)', 'Mert Günok (Fenerbahçe)', 'Muhammed Sengezer (Basaksehir)', 'Ugurcan Çakir (Galatasaray)'],
    df: ['Abdülkerim Bardakci (Galatasaray)', 'Ahmetcan Kaplan (NEC Nijmegen)', 'Caglar Söyüncü (Fenerbahçe)', 'Eren Elmali (Galatasaray)', 'Ferdi Kadioglu (Brighton & Hove Albion)', 'Merih Demiral (Al-Ahli Saudi)', 'Mert Müldür (Fenerbahçe)', 'Mustafa Eskihellac (Trabzonspor)', 'Ozan Kabak (Hoffenheim)', 'Samet Akaydin (Çaykur Rizespor)', 'Yusuf Akcicek (Al-Hilal Saudi)', 'Zeki Çelik (AS Roma)'],
    mf: ['Atakan Karazor (VfB Stuttgart)', 'Demir Ege Tiknaz (Braga)', 'Hakan Çalhanoglu (Inter de Milán)', 'Ismail Yüksek (Fenerbahçe)', 'Kaan Ayhan (Galatasaray)', 'Orkun Kökçü (Beşiktaş)', 'Salih Özcan (Borussia Dortmund)', 'Aral Simsir (Midtjylland)', 'Arda Güler (Real Madrid)', 'Baris Alper Yilmaz (Galatasaray)', 'Can Uzun (Eintracht Frankfurt)'],
    fw: ['Deniz Gül (FC Porto)', 'Irfan Can Kahveci (Kasımpaşa)', 'Kenan Yildiz (Juventus)', 'Kerem Akturkoglu (Fenerbahçe)', 'Oguz Aydin (Alanyaspor)', 'Yunus Akgün (Galatasaray)', 'Yusuf Sari (Başakşehir)'],
  },

  // ── Grupo E ───────────────────────────────────────────────────────────────
  de: {
    gk: ['Oliver Baumann (Hoffenheim)', 'Manuel Neuer (Bayern Munich)', 'Alexander Nübel (Stuttgart)'],
    df: ['Waldemar Anton (Borussia Dortmund)', 'Nathaniel Brown (Eintracht Frankfurt)', 'David Raum (RB Leipzig)', 'Antonio Rüdiger (Real Madrid)', 'Nico Schlotterbeck (Borussia Dortmund)', 'Jonathan Tah (Bayern Munich)', 'Malick Thiaw (Newcastle)'],
    mf: ['Pascal Gross (Brighton)', 'Joshua Kimmich (Bayern Munich)', 'Aleksandar Pavlovic (Bayern Munich)', 'Felix Nmecha (Borussia Dortmund)', 'Angelo Stiller (Stuttgart)', 'Nadiem Amiri (Mainz)', 'Leon Goretzka (Bayern Munich)', 'Jamie Leweling (Stuttgart)'],
    fw: ['Maximilian Beier (Borussia Dortmund)', 'Kai Havertz (Arsenal)', 'Lennart Karl (Bayern Munich)', 'Jamal Musiala (Bayern Munich)', 'Leroy Sané (Galatasaray)', 'Deniz Undav (Stuttgart)', 'Florian Wirtz (Liverpool)', 'Nick Woltemade (Newcastle)'],
  },
  cw: {
    gk: ['Eloy Room (Miami FC)', 'Tyrick Bodak (Telstar)', 'Trevor Doornbusch (VVV Venlo)'],
    df: ['Riechedly Bazoer (Konyaspor)', 'Joshua Brenet (Kayserispor)', 'Roshon van Eijma (RKC Waalwijk)', 'Sherel Floranus (PEC Zwolle)', 'Deveron Fonville (NEC Nijmegen)', 'Juriën Gaari (Abha)', 'Armando Obispo (PSV Eindhoven)', 'Shurandy Sambo (Sparta Rotterdam)'],
    mf: ['Juninho Bacuna (Volendam)', 'Leandro Bacuna (Igdir)', 'Livano Comenencia (Zurich)', 'Kevin Felida (Den Bosch)', "Ar'jany Martha (Rotherham United)", 'Tyrese Noslin (Telstar)', 'Godfried Roemeratoe (RKC Waalwijk)'],
    fw: ['Jeremy Antonisse (Kifisia)', 'Tahith Chong (Sheffield United)', 'Kenji Gorré (Maccabi Haifa)', 'Sontje Hansen (Middlesbrough)', 'Gervane Kastaneer (Terengganu)', 'Brandley Kuwas (Volendam)', 'Jürgen Locadia (Miami FC)', 'Jearl Margaritha (Beveren)'],
  },
  ci: {
    gk: ['Yahia Fofana (Rizespor)', 'Mohamed Koné (Charleroi)', 'Alban Lafont (Panathinaikos)'],
    df: ['Emmanuel Agbadou (Beşiktaş)', 'Clément Akpa (AJ Auxerre)', 'Ousmane Diomande (Sporting CP)', 'Guela Doué (Strasbourg)', 'Ghislain Konan (Gil Vicente)', 'Odilon Kossounou (Atalanta)', 'Evan Ndicka (AS Roma)', 'Wilfried Singo (Galatasaray)'],
    mf: ['Seko Fofana (Porto)', 'Parfait Guiagon (Charleroi)', 'Franck Kessié (Al Ahli)', 'Christ Inao Oulaï (Trabzonspor)', 'Ibrahim Sangaré (Nottingham Forest)', 'Jean Michaël Seri (NK Maribor)'],
    fw: ['Simon Adingra (AS Monaco)', 'Ange-Yoan Bonny (Internazionale)', 'Amad Diallo (Manchester United)', 'Oumar Diakité (Cercle Brugge)', 'Yan Diomande (RB Leipzig)', 'Evann Guessand (Aston Villa)', 'Nicolas Pépé (Villarreal)', 'Bazoumana Touré (Hoffenheim)', 'Elye Wahi (Nice)'],
  },
  ec: {
    gk: ['Hernán Galíndez (Huracán)', 'Moisés Ramírez (AE Kifisias)', 'Gonzalo Valle (LDU Quito)'],
    df: ['Willian Pacho (PSG)', 'Piero Hincapié (Arsenal)', 'Joel Ordóñez (Club Brugge)', 'Félix Torres (Internacional)', 'Pervis Estupiñán (AC Milan)', 'Ángelo Preciado (Atlético Mineiro)', 'Jackson Porozo (Club Tijuana)'],
    mf: ['Moisés Caicedo (Chelsea)', 'Jordy Alcívar (Independiente)', 'Denil Castillo (Midtjylland)', 'Alan Franco (Atlético Mineiro)', 'Pedro Vite (Pumas UNAM)', 'Kendry Páez (River Plate)', 'Yaimar Medina (KRC Genk)'],
    fw: ['Kevin Rodríguez (Union Saint-Gilloise)', 'Anthony Valencia (Royal Antwerp)', 'Enner Valencia (Pachuca)', 'Jordy Caicedo (Huracán)', 'Jeremy Arévalo (Stuttgart)', 'Gonzalo Plata (Flamengo)', 'Alan Minda (Atlético Mineiro)', 'John Yeboah (Venezia)', 'Nilson Angulo (Sunderland)'],
  },

  // ── Grupo F ───────────────────────────────────────────────────────────────
  nl: {
    gk: ['Mark Flekken (Bayer Leverkusen)', 'Robin Roefs (Sunderland)', 'Bart Verbruggen (Brighton)'],
    df: ['Nathan Aké (Manchester City)', 'Denzel Dumfries (Inter Milan)', 'Jorrel Hato (Chelsea)', 'Jurriën Timber (Arsenal)', 'Jan Paul van Hecke (Brighton)', 'Micky van de Ven (Tottenham)', 'Virgil van Dijk (Liverpool)'],
    mf: ['Frenkie de Jong (Barcelona)', 'Marten de Roon (Atalanta)', 'Ryan Gravenberch (Liverpool)', 'Teun Koopmeiners (Juventus)', 'Tijjani Reijnders (Manchester City)', 'Guus Til (PSV)', 'Quinten Timber (Marseille)', 'Mats Wieffer (Brighton)'],
    fw: ['Brian Brobbey (Sunderland)', 'Memphis Depay (Corinthians)', 'Cody Gakpo (Liverpool)', 'Justin Kluivert (Bournemouth)', 'Noa Lang (Galatasaray)', 'Donyell Malen (Roma)', 'Crysencio Summerville (West Ham)', 'Wout Weghorst (Ajax)'],
  },
  jp: {
    gk: ['Zion Suzuki (Parma)', 'Keisuke Osako (Sanfrecce Hiroshima)', 'Tomoki Hayakawa (Kashima Antlers)'],
    df: ['Yuto Nagatomo (FC Tokyo)', 'Shogo Taniguchi (Sint-Truiden)', 'Ko Itakura (Ajax)', 'Tsuyoshi Watanabe (Feyenoord)', 'Takehiro Tomiyasu (Ajax)', 'Hiroki Ito (Bayern Munich)', 'Ayumu Seko (Le Havre)', 'Yukinari Sugawara (Werder Bremen)'],
    mf: ['Junnosuke Suzuki (Copenhagen)', 'Wataru Endo (Liverpool)', 'Junya Ito (Genk)', 'Daichi Kamada (Crystal Palace)', 'Ritsu Doan (Eintracht Frankfurt)', 'Ao Tanaka (Leeds United)', 'Keito Nakamura (Reims)', 'Kaishu Sano (Mainz)', 'Takefusa Kubo (Real Sociedad)', 'Yuito Suzuki (Freiburg)'],
    fw: ['Koki Ogawa (NEC Nijmegen)', 'Daizen Maeda (Celtic)', 'Ayase Ueda (Feyenoord)', 'Kento Shiogai (VfL Wolfsburg)', 'Keisuke Goto (Sint-Truiden)'],
  },
  se: {
    gk: ['Viktor Johansson (Stoke City)', 'Kristoffer Nordfeldt (AIK)', 'Jacob Widell Zetterstrom (Derby County)'],
    df: ['Hjalmar Ekdal (Burnley)', 'Gabriel Gudmundsson (Leeds United)', 'Isak Hien (Atalanta)', 'Emil Holm (Juventus)', 'Gustaf Lagerbielke (Braga)', 'Victor Lindelöf (Aston Villa)', 'Erik Smith (St. Pauli)', 'Carl Starfelt (Celta Vigo)', 'Elliot Stroud (Mjällby)', 'Daniel Svensson (Borussia Dortmund)'],
    mf: ['Taha Ali (Malmö)', 'Yasin Ayari (Brighton)', 'Lucas Bergvall (Tottenham)', 'Jesper Karlström (Udinese)', 'Ken Sema (Pafos)', 'Mattias Svanberg (Wolfsburg)', 'Besfort Zeneli (Union Saint-Gilloise)'],
    fw: ['Alexander Bernhardsson (Holstein Kiel)', 'Anthony Elanga (Newcastle United)', 'Viktor Gyökeres (Arsenal)', 'Alexander Isak (Liverpool)', 'Gustaf Nilsson (Club Brugge)', 'Benjamin Nygren (Celtic)'],
  },
  tn: {
    gk: ['Aymen Dahmen (CS Sfaxien)', 'Sabri Ben Hessen (Étoile du Sahel)', 'Abdelmouhib Chamakh (Club Africain)'],
    df: ['Montassar Talbi (Lorient)', 'Dylan Bronn (Servette)', 'Omar Rekik (Maribor)', 'Yan Valery (Young Boys)', 'Ali Abdi (Nice)', 'Moutaz Neffati (IFK Norrköping)', 'Raed Chikhaoui (US Monastir)', 'Adam Arous (Kasımpaşa)', 'Mohamed Amine Ben Hamida (Espérance de Tunis)'],
    mf: ['Ellyes Skhiri (Eintracht Frankfurt)', 'Hannibal Mejbri (Burnley)', 'Anis Ben Slimane (Norwich City)', 'Hadj Mahmoud (Lugano)', 'Rani Khedira (Union Berlin)', 'Mortadha Ben Ouanes (Kasımpaşa)'],
    fw: ['Elias Achouri (Copenhagen)', 'Ismaël Gharbi (Augsburg)', 'Elias Saad (Hannover 96)', 'Sebastian Tounekti (Celtic)', 'Firas Chaouat (Club Africain)', 'Khalil Ayari (Paris Saint-Germain)', 'Hazem Mastouri (Dynamo Makhachkala)', 'Rayan Elloumi (Vancouver Whitecaps)'],
  },

  // ── Grupo G ───────────────────────────────────────────────────────────────
  be: {
    gk: ['Thibaut Courtois (Real Madrid)', 'Senne Lammens (Manchester United)', 'Mike Penders (Chelsea)'],
    df: ['Timothy Castagne (Fulham)', 'Zeno Debast (Sporting CP)', 'Maxim De Cuyper (Brighton & Hove Albion)', 'Koni De Winter (AC Milan)', 'Brandon Mechele (Club Brugge)', 'Thomas Meunier (Lille)', 'Nathan Ngoy (Lille)', 'Joaquin Seys (Club Brugge)', 'Arthur Theate (Eintracht Frankfurt)'],
    mf: ['Kevin De Bruyne (Napoli)', 'Amadou Onana (Aston Villa)', 'Nicolas Raskin (Rangers)', 'Youri Tielemans (Aston Villa)', 'Hans Vanaken (Club Brugge)', 'Axel Witsel (Girona)'],
    fw: ['Charles De Ketelaere (Atalanta)', 'Jérémy Doku (Manchester City)', 'Matias Fernandez-Pardo (Lille)', 'Romelu Lukaku (Napoli)', 'Dodi Lukebakio (Benfica)', 'Diego Moreira (Strasbourg)', 'Alexis Saelemaekers (AC Milan)', 'Leandro Trossard (Arsenal)'],
  },
  eg: {
    gk: ['Mohamed El Shenawy (Al Ahly)', 'Mostafa Shobeir (Al Ahly)', 'El Mahdi Soliman (Zamalek)', 'Mohamed Alaa (El Gouna)'],
    df: ['Mohamed Hany (Al Ahly)', 'Tarek Alaa (Zed)', 'Hamdy Fathy (Al Wakrah)', 'Rami Rabia (Al Ain)', 'Yasser Ibrahim (Al Ahly)', 'Hossam Abdelmaguid (Zamalek)', 'Mohamed Abdelmonem (Nice)', 'Ahmed Fatouh (Zamalek)', 'Karim Hafez (Pyramids)'],
    mf: ['Marwan Ateya (Al Ahly)', 'Mohanad Lasheen (Pyramids)', 'Nabil Emad (Al Najma)', 'Mahmoud Saber (Zed)', 'Ahmed Zizo (Al Ahly)', 'Emam Ashour (Al Ahly)', 'Mostafa Ziko (Pyramids)', 'Mahmoud Trezeguet (Al Ahly)', 'Ibrahim Adel (Nordsjaelland)', 'Haissem Hassan (Real Oviedo)'],
    fw: ['Omar Marmoush (Manchester City)', 'Mohamed Salah (Liverpool)', 'Aqtay Abdallah (Enppi)', 'Hamza Abdelkarim (Barcelona)'],
  },
  ir: {
    gk: ['Alireza Beiranvand (Tractor)', 'Hossein Hosseini (Sepahan)', 'Payam Niazmand (Persepolis)'],
    df: ['Danial Eiri (Malavan)', 'Ehsan Hajsafi (Sepahan)', 'Saleh Hardani (Esteghlal)', 'Hossein Kanaani (Persepolis)', 'Shoja Khalilzadeh (Tractor)', 'Milad Mohammadi (Persepolis)', 'Omid Noorafkan (Foolad)', 'Ramin Rezaeian (Foolad)'],
    mf: ['Rouzbeh Cheshmi (Esteghlal)', 'Saeid Ezatolahi (Shabab Al-Ahli)', 'Mehdi Ghaedi (Al-Nasr)', 'Saman Ghoddos (Kalba)', 'Mohammad Ghorbani (Al-Wahda)', 'Alireza Jahanbakhsh (Dender)', 'Mohammad Mohebi (Rostov)', 'Amir Mohammad Razzaghinia (Esteghlal)', 'Mehdi Torabi (Tractor)', 'Aria Yousefi (Sepahan)'],
    fw: ['Ali Alipour (Persepolis)', 'Dennis Dargahi (Standard Liege)', 'Amirhossein Hosseinzadeh (Tractor)', 'Mehdi Taremi (Olympiacos)', 'Shahriyar Moghanloo (Sepahan)'],
  },
  nz: {
    gk: ['Max Crocombe (Millwall)', 'Alex Paulsen (Lechia Gdańsk)', 'Michael Woud (Auckland FC)'],
    df: ['Tim Payne (Wellington Phoenix)', 'Francis De Vries (Auckland FC)', 'Tyler Bindon (Nottingham Forest)', 'Michael Boxall (Minnesota United)', 'Liberato Cacace (Wrexham)', 'Nando Pijnaker (Auckland FC)', 'Finn Surman (Portland Timbers)', 'Callan Elliot (Auckland FC)', 'Tommy Smith (Braintree Town)'],
    mf: ['Joe Bell (Viking FK)', 'Matt Garbett (Peterborough United)', 'Marko Stamenic (Swansea City)', 'Sarpreet Singh (Wellington Phoenix)', 'Alex Rufer (Wellington Phoenix)', 'Ryan Thomas (PEC Zwolle)'],
    fw: ['Chris Wood (Nottingham Forest)', 'Eli Just (Motherwell)', 'Kosta Barbarouses (Western Sydney Wanderers)', 'Ben Waine (Port Vale)', 'Ben Old (Saint-Étienne)', 'Callum McCowatt (Silkeborg IF)', 'Jesse Randall (Auckland FC)', 'Lachlan Bayliss (Newcastle Jets)'],
  },

  // ── Grupo H ───────────────────────────────────────────────────────────────
  es: {
    gk: ['Unai Simón (Athletic Club)', 'David Raya (Arsenal)', 'Joan García (Barcelona)'],
    df: ['Marc Cucurella (Chelsea)', 'Pau Cubarsí (Barcelona)', 'Aymeric Laporte (Athletic Club)', 'Álex Grimaldo (Bayer Leverkusen)', 'Pedro Porro (Tottenham Hotspur)', 'Eric García (Barcelona)', 'Marcos Llorente (Atlético Madrid)', 'Marc Pubill (Atlético Madrid)'],
    mf: ['Gavi (Barcelona)', 'Rodri (Manchester City)', 'Pedri (Barcelona)', 'Martín Zubimendi (Arsenal)', 'Fabián Ruiz (PSG)', 'Álex Baena (Atlético Madrid)', 'Mikel Merino (Arsenal)'],
    fw: ['Lamine Yamal (Barcelona)', 'Nico Williams (Athletic Club)', 'Dani Olmo (Barcelona)', 'Ferran Torres (Barcelona)', 'Mikel Oyarzabal (Real Sociedad)', 'Yéremy Pino (Crystal Palace)', 'Borja Iglesias (Celta Vigo)', 'Víctor Muñoz (Osasuna)'],
  },
  cv: {
    gk: ['Vozinha (Chaves)', 'Marcio Rosa (Montana)', 'CJ dos Santos (San Diego FC)'],
    df: ['Steven Moreira (Columbus Crew)', 'Wagner Pina (Trabzonspor)', 'Joao Paulo (FCSB)', 'Sidny Lopes Cabral (Benfica)', 'Logan Costa (Villarreal)', 'Pico (Shamrock Rovers)', 'Kelvin Pires (SJK)', 'Stopira (Torreense)', 'Diney (Al Bataeh)'],
    mf: ['Jamiro Monteiro (PEC Zwolle)', 'Telmo Arcanjo (Vitoria Guimaraes)', 'Yannick Semedo (Farense)', 'Laros Duarte (Puskas Akademia)', 'Deroy Duarte (Ludogorets Razgrad)', 'Kevin Pina (Krasnodar)'],
    fw: ['Ryan Mendes (Igdir)', 'Willy Semedo (Omonia)', 'Garry Rodrigues (Apollon Limassol)', 'Jovane Cabral (Estrela Amadora)', 'Nuno da Costa (Istanbul Basaksehir)', 'Dailon Livramento (Casa Pia)', 'Gilson Benchimol (Akron Tolyatti)', 'Helio Varela (Maccabi Tel Aviv)'],
  },
  uy: {
    gk: ['Fernando Muslera (Estudiantes de La Plata)', 'Sergio Rochet (Internacional de Porto Alegre)', 'Santiago Mele (Monterrey)'],
    df: ['Ronald Araújo (Barcelona)', 'José María Giménez (Atlético Madrid)', 'Santiago Bueno (Wolverhampton Wanderers)', 'Sebastián Cáceres (Club América)', 'Mathías Olivera (Napoli)', 'Guillermo Varela (Flamengo)', 'Matías Viña (River Plate)', 'Joaquín Piquerez (Palmeiras)', 'Juan Manuel Sanabria (Real Salt Lake)'],
    mf: ['Federico Valverde (Real Madrid)', 'Rodrigo Bentancur (Tottenham Hotspur)', 'Manuel Ugarte (Manchester United)', 'Emiliano Martínez (Palmeiras)', 'Rodrigo Zalazar (Sporting de Lisboa)', 'Giorgian De Arrascaeta (Flamengo)', 'Nicolás De La Cruz (Flamengo)', 'Agustín Canobbio (Fluminense)', 'Maximiliano Araújo (Sporting de Lisboa)', 'Brian Rodríguez (Club América)', 'Facundo Pellistri (Panathinaikos)'],
    fw: ['Darwin Núñez (Al-Hilal)', 'Federico Viñas (Real Oviedo)', 'Rodrigo Aguirre (Tigres)'],
  },
  sa: {
    gk: ['Nawaf Al Aqidi (Al-Nassr)', 'Mohamed Al Owais (Al-Ula)', 'Ahmed Alkassar (Al-Qadsiah)'],
    df: ['Saud Abdulhamid (Lens)', 'Jehad Thakri (Al-Qadsiah)', 'Abdulelah Al Amri (Al-Nassr)', 'Hassan Tambakti (Al-Hilal)', 'Ali Lajami (Al-Hilal)', 'Hassan Kadesh (Al-Ittihad)', 'Moteb Al Harbi (Al-Hilal)', 'Nawaf Boushal (Al-Nassr)', 'Ali Majrashi (Al-Ahli)', 'Mohammed Abu Alshamat (Al-Qadsiah)'],
    mf: ['Ziyad Al Johani (Al-Ahli)', 'Nasser Al Dawsari (Al-Hilal)', 'Mohamed Kanno (Al-Hilal)', 'Abdullah Al Khaibari (Al-Nassr)', 'Alaa Al Hejji (Neom)', 'Musab Al Juwayr (Al-Qadsiah)', 'Sultan Mandash (Al-Hilal)', 'Ayman Yahya (Al-Nassr)', 'Khalid Al Ghannam (Al-Ettifaq)'],
    fw: ['Salem Al Dawsari (Al-Hilal)', 'Abdullah Al Hamdan (Al-Nassr)', 'Feras Al Brikan (Al-Ahli)', 'Saleh Al Shehri (Al-Ittihad)'],
  },

  // ── Grupo I ───────────────────────────────────────────────────────────────
  fr: {
    gk: ['Mike Maignan (AC Milan)', 'Robin Risser (Lens)', 'Brice Samba (Rennes)'],
    df: ['Lucas Digne (Aston Villa)', 'Malo Gusto (Chelsea)', 'Lucas Hernández (Paris Saint-Germain)', 'Theo Hernández (Al Hilal)', 'Ibrahima Konaté (Liverpool)', 'Jules Koundé (Barcelona)', 'Maxence Lacroix (Crystal Palace)', 'William Saliba (Arsenal)', 'Dayot Upamecano (Bayern Munich)'],
    mf: ["N'Golo Kanté (Fenerbahçe)", 'Manu Koné (AS Roma)', 'Adrien Rabiot (AC Milan)', 'Aurélien Tchouaméni (Real Madrid)', 'Warren Zaïre-Emery (Paris Saint-Germain)'],
    fw: ['Maghnes Akliouche (AS Monaco)', 'Bradley Barcola (Paris Saint-Germain)', 'Rayan Cherki (Manchester City)', 'Désiré Doué (Paris Saint-Germain)', 'Jean-Philippe Mateta (Crystal Palace)', 'Kylian Mbappé (Real Madrid)', 'Michael Olise (Bayern Munich)', 'Marcus Thuram (Internazionale)'],
  },
  sn: {
    gk: ['Édouard Mendy (Al Ahli)', 'Mory Diaw (Le Havre)', 'Yehvann Diouf (Niza)'],
    df: ['Krépin Diatta (Mónaco)', 'Antoine Mendy (Niza)', 'Kalidou Koulibaly (Al Ahli)', 'El Hadji Malick Diouf (West Ham)', 'Mamadou Sarr (Estrasburgo)', 'Moussa Niakhaté (O. Lyon)', 'Abdoulaye Seck (Maccabi Haifa)', 'Ismail Jakobs (Galatasaray)'],
    mf: ['Idrissa Gana Gueye (Everton)', 'Pape Gueye (Villarreal)', 'Lamine Camara (Mónaco)', 'Habib Diarra (Sunderland)', 'Pathé Ciss (Rayo Vallecano)', 'Pape Matar Sarr (Tottenham)', 'Bara Sapoko Ndiaye (Bayern)'],
    fw: ['Sadio Mané (Al Nassr)', 'Ismaïla Sarr (Crystal Palace)', 'Iliman Ndiaye (Everton)', 'Assane Diao (Como)', 'Ibrahim Mbaye (PSG)', 'Nicolas Jackson (Bayern)', 'Bamba Dieng (Lorient)', 'Cherif Ndiaye (Samsunspor)'],
  },
  iq: {
    gk: ['Fahad Talib (Al-Talaba)', 'Jalal Hassan (Al-Zawraa)', 'Ahmed Basil (Al-Shorta)'],
    df: ['Hussein Ali (Pogon Szczecin)', 'Manaf Younis (Al-Shorta)', 'Ahmed Yahya (Al-Shorta)', 'Mustafa Saadoon (Al-Shorta)', 'Zaid Tahseen (Pakhtakor)', 'Rebin Sulaka (Port)', 'Akam Hashim (Al-Zawraa)', 'Merchas Doski (Viktoria Plzen)', 'Zaid Ismail (Al-Talaba)', 'Frans Putros (Persib)'],
    mf: ['Amir Al-Ammari (Cracovia)', 'Kevin Yakob (Aarhus GF)', 'Zidane Iqbal (Utrecht)', 'Aimar Sher (Sarpsborg)', 'Ibrahim Bayesh (Al-Dhafra)', 'Ahmed Qasem (Nashville SC)', 'Youssef Amyn (AEK Larnaca)', 'Marko Farji (Venezia)'],
    fw: ['Ali Jassim (Al-Najma)', 'Ali Al-Hamadi (Ipswich)', 'Ali Yousef (Al-Talaba)', 'Aymen Hussein (Al-Karma)', 'Mohanad Ali (Dibba)'],
  },
  no: {
    gk: ['Ørjan Nyland (Sevilla)', 'Egil Selvik (Watford)', 'Sander Tangvik (Hamburg SV)'],
    df: ['Julian Ryerson (Borussia Dortmund)', 'Kristoffer Ajer (Brentford)', 'Leo Østigard (Genoa)', 'David Møller Wolfe (Wolverhampton Wanderers)', 'Marcus Pedersen (Torino)', 'Torbjørn Heggem (Bologna)', 'Fredrik André Bjørkan (Bodø/Glimt)', 'Henrik Falchener (Viking)', 'Sondre Langås (Derby County)'],
    mf: ['Martin Ødegaard (Arsenal)', 'Sander Berge (Fulham)', 'Patrick Berg (Bodø/Glimt)', 'Kristian Thorstvedt (Sassuolo)', 'Morten Thorsby (Cremonese)', 'Thelo Aasgaard (Rangers)', 'Andreas Schjelderup (Benfica)', 'Jens Petter Hauge (Bodø/Glimt)', 'Fredrik Aursnes (Benfica)', 'Oscar Bobb (Fulham)', 'Antonio Nusa (RB Leipzig)'],
    fw: ['Erling Haaland (Manchester City)', 'Alexander Sørloth (Atlético Madrid)', 'Jørgen Strand Larsen (Crystal Palace)'],
  },

  // ── Grupo J ───────────────────────────────────────────────────────────────
  ar: {
    gk: ['Emiliano Martínez (Aston Villa)', 'Gerónimo Rulli (Marseille)', 'Juan Musso (Atlético Madrid)'],
    df: ['Gonzalo Montiel (River Plate)', 'Nahuel Molina (Atlético Madrid)', 'Lisandro Martínez (Manchester United)', 'Nicolás Otamendi (Benfica)', 'Leonardo Balerdi (Marseille)', 'Cristian Romero (Tottenham)', 'Facundo Medina (Marseille)', 'Nicolás Tagliafico (Lyon)'],
    mf: ['Leandro Paredes (Boca Juniors)', 'Rodrigo De Paul (Inter Miami)', 'Exequiel Palacios (Bayer Leverkusen)', 'Enzo Fernández (Chelsea)', 'Alexis Mac Allister (Liverpool)', 'Giovani Lo Celso (Real Betis)', 'Valentín Barco (Strasbourg)'],
    fw: ['Lionel Messi (Inter Miami)', 'Nico Paz (Como)', 'Thiago Almada (Atlético Madrid)', 'Nicolás González (Atlético Madrid)', 'Giuliano Simeone (Atlético Madrid)', 'Lautaro Martínez (Internazionale)', 'Jose Manuel López (Palmeiras)', 'Julián Álvarez (Atlético Madrid)'],
  },
  dz: {
    gk: ['Oussama Benbot (USM Alger)', 'Melvin Masstil (Stade Nyonnaise)', 'Luca Zidane (Granada)'],
    df: ['Achraf Abada (USM Alger)', 'Rayan Aït-Nouri (Manchester City)', 'Zinedine Belaid (JS Kabylie)', 'Rafik Belghali (Verona)', 'Ramy Bensebaini (Borussia Dortmund)', 'Samir Chergui (Paris FC)', 'Jaouen Hadjam (Young Boys)', 'Aïssa Mandi (Lille)', 'Mohamed Amine Tougai (Espérance)'],
    mf: ['Houssem Aouar (Al Ittihad)', 'Nabil Bentaleb (Lille)', 'Hicham Boudaoui (Nice)', 'Farès Chaïbi (Eintracht Frankfurt)', 'Ibrahim Maza (Bayer Leverkusen)', 'Yassine Titraoui (Charleroi)', 'Ramiz Zerrouki (FC Twente)'],
    fw: ['Mohamed Amine Amoura (VfL Wolfsburg)', 'Nadir Benbouali (Győri ETO)', 'Adil Boulbina (Al-Duhail)', 'Fares Ghedjemis (Frosinone)', 'Amine Gouiri (Olympique de Marseille)', 'Riyad Mahrez (Al-Ahli)', 'Anis Hadj Moussa (Feyenoord)'],
  },
  at: {
    gk: ['Alexander Schlager (RB Salzburg)', 'Florian Wiegele (Viktoria Plzen)', 'Patrick Pentz (Brondby)'],
    df: ['David Affengruber (Elche)', 'Kevin Danso (Tottenham)', 'Stefan Posch (Mainz 05)', 'David Alaba (Real Madrid)', 'Philipp Lienhart (SC Freiburg)', 'Philipp Mwene (Mainz 05)', 'Alexander Prass (TSG Hoffenheim)', 'Marco Friedl (Werder Bremen)', 'Michael Svoboda (Venezia)'],
    mf: ['Xaver Schlager (RB Leipzig)', 'Nicolas Seiwald (RB Leipzig)', 'Marcel Sabitzer (Borussia Dortmund)', 'Florian Grillitsch (Braga)', 'Carney Chukwuemeka (Borussia Dortmund)', 'Romano Schmid (Werder Bremen)', 'Christoph Baumgartner (RB Leipzig)', 'Konrad Laimer (Bayern Munich)', 'Patrick Wimmer (Wolfsburg)', 'Paul Wanner (PSV Eindhoven)', 'Alessandro Schöpf (Wolfsberger AC)'],
    fw: ['Marko Arnautovic (Red Star Belgrade)', 'Michael Gregoritsch (FC Augsburg)', 'Sasa Kalajdzic (LASK Linz)'],
  },
  jo: {
    gk: ['Yazid Abulaila (Al-Hussein)', 'Abdallah Al-Fakhouri (Al-Wehdat)', 'Ahmad Al-Juiadi (Shabab Al-Ordon)', 'Nour Bani Attiah (Al-Faisaly)'],
    df: ['Mohammad Abualnadi (Selangor)', 'Yousef Abu Al-Jazar (Al-Hussein)', 'Husam Abu Dahab (Al-Faisaly)', 'Mohammed Abu Hashish (Al-Karma)', 'Mohannad Abu Taha (Al-Quwa Al-Jawiya)', 'Yazan Al-Arab (FC Seoul)', 'Saed Al-Rosna (Al-Hussein)', 'Ahmad Assaf (Al-Hussein)', 'Anas Badawi (Al-Faisaly)', 'Abdallah Nasib (Al-Zawraa)', 'Ehsan Haddad (Al-Hussein)', 'Saleem Obaid (Al-Hussein)'],
    mf: ['Mohammed Al-Dawoud (Al-Wehdat)', 'Nizar Al-Rashdan (Qatar SC)', 'Noor Al-Rawabdeh (Selangor)', 'Rajaei Ayed (Al-Hussein)', 'Amer Jamous (Al-Zawraa)', 'Yousef Qashi (Al-Hussein)', 'Ibrahim Sadeh (Al-Karma)'],
    fw: ['Mohammed Abu Zraiq (Raja Casablanca)', 'Mousa Al-Tamari (Rennes)', 'Ali Azaizeh (Al-Shabab)', 'Odeh Al-Fakhouri (Pyramids)', 'Ali Olwan (Al-Sailiaya)', 'Ibrahim Sabra (Lokomotiva Zagreb)'],
  },

  // ── Grupo K ───────────────────────────────────────────────────────────────
  pt: {
    gk: ['Diogo Costa (Porto)', 'José Sá (Wolverhampton Wanderers)', 'Rui Silva (Sporting Lisbon)', 'Ricardo Velho (Gençlerbirliği)'],
    df: ['Rúben Dias (Manchester City)', 'João Cancelo (Barcelona)', 'Diogo Dalot (Manchester United)', 'Nuno Mendes (Paris Saint-Germain)', 'Nélson Semedo (Fenerbahçe)', 'Matheus Nunes (Manchester City)', 'Gonçalo Inacio (Sporting Lisbon)', 'Renato Veiga (Villarreal)', 'Tomás Araújo (Benfica)'],
    mf: ['Bruno Fernandes (Manchester United)', 'Bernardo Silva (Manchester City)', 'Vitinha (PSG)', 'João Neves (PSG)', 'Rúben Neves (Al Hilal)', 'Samú Costa (Mallorca)'],
    fw: ['Cristiano Ronaldo (Al Nassr)', 'Rafael Leão (AC Milan)', 'João Félix (Al Nassr)', 'Gonçalo Ramos (PSG)', 'Pedro Neto (Chelsea)', 'Francisco Conceição (Juventus)', 'Gonçalo Guedes (Real Sociedad)', 'Francisco Trincão (Sporting Lisbon)'],
  },
  cd: {
    gk: ['Lionel Mpasi (Le Havre)', 'Timothy Fayulu (FC Noah)', 'Matthieu Epolo (Standard Liege)'],
    df: ['Chancel Mbemba (Lille)', 'Axel Tuanzebe (Burnley)', 'Arthur Masuaku (Lens)', 'Gedeon Kalulu (Aris Limassol)', 'Joris Kayembe (Genk)', 'Aaron Wan-Bissaka (West Ham United)', 'Aaron Tshibola (Kilmarnock)', 'Steve Kapuadi (Widzew Łódź)', 'Dylan Batubinsika (AEL)'],
    mf: ['Noah Sadiki (Sunderland)', 'Charles Pickel (Espanyol)', 'Edo Kayembe (Watford)', 'Samuel Moutoussamy (Atromitos)', "Ngal'ayel Mukau (Lille)", 'Nathanaël Mbuku (Montpellier)', 'Meschak Elia (Alanyaspor)', 'Brian Cipenga (Castellón)', 'Gaël Kakuta (AEL)', 'Théo Bongonda (Spartak Moscow)'],
    fw: ['Simon Banza (Al Jazira)', 'Yoane Wissa (Newcastle United)', 'Fiston Mayele (Pyramids FC)', 'Cédric Bakambu (Real Betis)'],
  },
  uz: {
    gk: ['Vladimir Nazarov (Pakhtakor)', 'Utkir Yusupov (Navbahor)', 'Botirali Ergashev (AGMK)', 'Abduvokhid Nematov (Nasaf)'],
    df: ['Ibrohimkhalil Yuldoshev (Neftchi)', 'Avazbek Ulmasaliev (AGMK)', 'Jakhongir Urozov (Dinamo Samarqand)', 'Rustamjon Ashurmatov (Esteghlal)', 'Mukhammadkodir Hamraliev (Pakhtakor)', 'Umarbek Eshmurodov (Nasaf)', 'Abdukodir Khusanov (Manchester City)', 'Abdulla Abdullaev (Dibba Al Fujairah)', 'Farrukh Sayfiev (Neftchi)', 'Khojiakbar Alijonov (Pakhtakor)', 'Sherzod Nasrullaev (Nasaf)', 'Muhammadrasul Abdumajidov (Pakhtakor)', 'Behruz Karimov (Surkhon)', 'Diyor Ortikboev (Khorazm)'],
    mf: ['Kuvondik Ruziev (Neftchi)', 'Sherzod Esanov (Buxoro)', 'Nodirbek Abdurazzokov (AGMK)', 'Odiljon Khamrobekov (Tractor)', 'Umarali Rakhmonaliev (Sabah)', 'Alisher Odilov (Neftchi)', 'Sardorbek Rakhmonov (Nasaf)', 'Akmal Mozgovoy (Pakhtakor)', 'Otabek Shukurov (Baniyas)', 'Jamshid Iskanderov (Neftchi)', 'Jasurbek Jaloliddinov (Sogdiana)', 'Azizjon Ganiev (Al Bataeh)'],
    fw: ['Abbosbek Fayzullaev (Istanbul Basaksehir)', 'Jaloliddin Masharipov (Esteghlal)', 'Dostonbek Khamdamov (Pakhtakor)', 'Oston Urunov (Persepolis)', 'Ruslanbek Jiyanov (Navbahor)', 'Azizbek Amonov (Buxoro)', 'Khusain Norchaev (Navbahor)', 'Sherzod Temirov (Erbil)', 'Igor Sergeev (Persepolis)', 'Eldor Shomurodov (Istanbul Basaksehir)'],
  },
  co: {
    gk: ['Álvaro Montero (Vélez Sarsfield)', 'David Ospina (Atlético Nacional)', 'Camilo Vargas (Atlas)'],
    df: ['Santiago Arias (Independiente)', 'Willer Ditta (Cruz Azul)', 'Jhon Lucumí (Bologna)', 'Deiver Machado (Nantes)', 'Yerry Mina (Cagliari)', 'Johan Mojica (Mallorca)', 'Daniel Muñoz (Crystal Palace)', 'Davinson Sánchez (Galatasaray)'],
    mf: ['Jhon Arias (Palmeiras)', 'Jaminton Campaz (Rosario Central)', 'Jorge Carrascal (Flamengo)', 'Kevin Castaño (River Plate)', 'Jefferson Lerma (Crystal Palace)', 'Juan Camilo Portilla (Athletico Paranaense)', 'Gustavo Puerta (Racing)', 'Juan Fernando Quintero (River Plate)', 'James Rodríguez (Minnesota United)', 'Richard Ríos (Benfica)'],
    fw: ['Jhon Córdoba (Krasnodar)', 'Carlos Andrés Gómez (Vasco Da Gama)', 'Juan Camilo Hernández (Real Betis)', 'Luis Suárez (Sporting)', 'Luis Díaz (Bayern Munich)'],
  },

  // ── Grupo L ───────────────────────────────────────────────────────────────
  'gb-eng': {
    gk: ['Jordan Pickford (Everton)', 'Dean Henderson (Crystal Palace)', 'James Trafford (Manchester City)'],
    df: ['Reece James (Chelsea)', 'Ezri Konsa (Aston Villa)', 'Jarell Quansah (Bayer Leverkusen)', 'John Stones (Manchester City)', 'Marc Guéhi (Manchester City)', 'Dan Burn (Newcastle United)', "Nico O'Reilly (Manchester City)", 'Djed Spence (Tottenham Hotspur)', 'Tino Livramento (Newcastle United)'],
    mf: ['Declan Rice (Arsenal)', 'Elliot Anderson (Nottingham Forest)', 'Kobbie Mainoo (Manchester United)', 'Jordan Henderson (Brentford)', 'Morgan Rogers (Aston Villa)', 'Jude Bellingham (Real Madrid)', 'Eberechi Eze (Arsenal)'],
    fw: ['Harry Kane (Bayern Munich)', 'Ivan Toney (Al-Ahli)', 'Ollie Watkins (Aston Villa)', 'Bukayo Saka (Arsenal)', 'Marcus Rashford (Barcelona)', 'Anthony Gordon (Newcastle United)', 'Noni Madueke (Arsenal)'],
  },
  hr: {
    gk: ['Dominik Livakovic (Dinamo Zagreb)', 'Dominik Kotarski (København)', 'Ivor Pandur (Hull City)'],
    df: ['Josko Gvardiol (Manchester City)', 'Duje Caleta-Car (Real Sociedad)', 'Josip Sutalo (Ajax)', 'Josip Stanisic (Bayern Munich)', 'Marin Pongracic (Fiorentina)', 'Martin Erlic (Midtjylland)', 'Luka Vuskovic (Hamburg)'],
    mf: ['Luka Modric (AC Milan)', 'Mateo Kovacic (Manchester City)', 'Mario Pasalic (Atalanta)', 'Nikola Vlasic (Torino)', 'Luka Sucic (Real Sociedad)', 'Martin Baturina (Como)', 'Kristijan Jakic (Augsburg)', 'Petar Sucic (Inter Milan)', 'Nikola Moro (Bologna)', 'Toni Fruk (Rijeka)'],
    fw: ['Ivan Perisic (PSV Eindhoven)', 'Andrej Kramaric (Hoffenheim)', 'Ante Budimir (Osasuna)', 'Marco Pasalic (Orlando City)', 'Petar Musa (FC Dallas)', 'Igor Matanovic (Freiburg)'],
  },
  gh: {
    gk: ['Benjamin Asare (Accra Hearts of Oak)', 'Lawrence Ati-Zigi (St. Gallen)', "Joseph Anang (St. Patrick's Athletic)"],
    df: ['Baba Abdul Rahman (PAOK)', 'Gideon Mensah (Auxerre)', 'Marvin Senaya (Auxerre)', 'Alidu Seidu (Rennes)', 'Abdul Mumin (Rayo Vallecano)', 'Jerome Opoku (Istanbul Basaksehir)', 'Jonas Adjetey (Wolfsburg)', 'Kojo Oppong Peprah (Nice)', 'Alexander Djiku (Spartak Moscow)', 'Elisha Owusu (Auxerre)'],
    mf: ['Thomas Partey (Villarreal)', 'Kwasi Sibo (Real Oviedo)', 'Augustine Boakye (Saint-Étienne)', 'Caleb Yirenkyi (FC Nordsjaelland)', 'Abdul Fatawu Issahaku (Leicester City)'],
    fw: ['Kamal Deen Sulemana (Atlanta)', 'Christopher Bonsu Baah (Al Qadsiah)', 'Ernest Nuamah (Lyon)', 'Antoine Semenyo (Manchester City)', 'Brandon Thomas-Asante (Coventry City)', 'Prince Kwabena Adu (Viktoria Plzen)', 'Iñaki Williams (Athletic Bilbao)', 'Jordan Ayew (Leicester City)'],
  },
  pa: {
    gk: ['Orlando Mosquera (Al Fayha)', 'Luis Mejía (Nacional)', 'César Samudio (Marathón)'],
    df: ['César Blackman (Slovan Bratislava)', 'Jorge Gutiérrez (Deportivo La Guaira)', 'Amir Murillo (Beşiktaş)', 'Fidel Escobar (Saprissa)', 'Andrés Andrade (LASK)', 'Edgardo Fariña (Pari Nizhny Novgorod)', 'José Córdoba (Norwich City)', 'Éric Davis (Plaza Amador)', 'Jiovany Ramos (Puerto Cabello)', 'Roderick Miller (Turan Tovuz)'],
    mf: ['Aníbal Godoy (San Diego FC)', 'Adalberto Carrasquilla (Pumas UNAM)', 'Carlos Harvey (Minnesota United)', 'Cristian Martínez (Ironi Kiryat Shmona)', 'José Luis Rodríguez (Juárez)', 'César Yanis (Cobresal)', 'Yoel Bárcenas (Mazatlán)', 'Alberto Quintero (Plaza Amador)', 'Azarias Londoño (Universidad Católica)'],
    fw: ['Ismael Díaz (Sin club)', 'Cecilio Waterman (Sin club)', 'José Fajardo (Sin club)', 'Tomás Rodríguez (Sin club)'],
  },
}

// ── Parser: "Nombre Apellidos (Club)" → {nombre, apellidos, club} ─────────────
// Apellido(s) único: si el nombre es de una sola palabra (Pedri, Vinicius Jr…),
// se guarda en `nombre` y `apellidos` queda vacío.
function parseEntry(raw, posicion, equipo_id) {
  const m = raw.match(/^(.+?)\s*\(([^)]+)\)\s*$/)
  if (!m) throw new Error(`Formato inválido: ${raw}`)
  const fullName = m[1].trim()
  const club = m[2].trim()

  const parts = fullName.split(/\s+/)
  let nombre, apellidos
  if (parts.length === 1) {
    nombre = parts[0]
    apellidos = ''
  } else {
    nombre = parts[0]
    apellidos = parts.slice(1).join(' ')
  }
  return { nombre, apellidos, posicion, club, equipo_id }
}

const POSICIONES = { gk: 'portero', df: 'defensa', mf: 'centrocampista', fw: 'delantero' }

function buildRows() {
  const rows = []
  for (const [codigo, grupos] of Object.entries(SQUADS)) {
    const equipo_id = EQUIPO_ID[codigo]
    if (!equipo_id) throw new Error(`Falta equipo_id para ${codigo}`)
    for (const [key, lista] of Object.entries(grupos)) {
      const posicion = POSICIONES[key]
      for (const raw of lista) {
        rows.push(parseEntry(raw, posicion, equipo_id))
      }
    }
  }
  return rows
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const rows = buildRows()
  console.log(`Total jugadores a insertar: ${rows.length}`)

  console.log('Borrando jugadores existentes…')
  const { error: delErr } = await supabase.from('jugadores').delete().gte('id', 0)
  if (delErr) { console.error('Error borrando:', delErr); process.exit(1) }

  console.log('Insertando convocatorias oficiales…')
  const CHUNK = 200
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK)
    const { error } = await supabase.from('jugadores').insert(slice)
    if (error) { console.error('Error insertando lote', i, error); process.exit(1) }
    console.log(`  ${Math.min(i + CHUNK, rows.length)}/${rows.length}`)
  }

  console.log('✓ Seed completado.')
}

main().catch(e => { console.error(e); process.exit(1) })
