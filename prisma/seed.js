const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const QUESTIONS_DATA = [
  // 1. Pop Culture
  {
    text: "Which fictional company with the slogan 'Products from across the globe, delivered in a box' was founded by Gavin Belson in the HBO comedy series Silicon Valley?",
    answerText: "Hooli",
    difficulty: "MEDIUM",
    status: "APPROVED",
    notes: "Silicon Valley Season 1-6 (HBO)",
    categories: [{ categoryId: "cat_pop_culture", subGenre: "TV & Streaming" }],
  },
  {
    text: "In the Marvel Cinematic Universe, what is the name of the pocket dimension within the Soul Stone where Thanos encounters a young Gamora after snapping his fingers?",
    answerText: "Soulworld (or the Soul Dimension)",
    difficulty: "HARD",
    status: "APPROVED",
    notes: "Avengers: Infinity War (2018)",
    categories: [{ categoryId: "cat_pop_culture", subGenre: "Superhero Comics" }],
  },

  // 2. Entertainment
  {
    text: "Which 1994 animated Disney film was originally developed under the working title 'King of the Jungle' before animators realized the animals lived in savannah grasslands?",
    answerText: "The Lion King",
    difficulty: "EASY",
    status: "APPROVED",
    notes: "Disney Animation history",
    categories: [{ categoryId: "cat_entertainment", subGenre: "Animation" }],
  },
  {
    text: "Which French electronic music duo composed and produced the entire 22-track original orchestral and electronic soundtrack for the 2010 sci-fi film Tron: Legacy?",
    answerText: "Daft Punk (Guy-Manuel de Homem-Christo and Thomas Bangalter)",
    difficulty: "MEDIUM",
    status: "APPROVED",
    notes: "Recorded with a 85-piece orchestra at AIR Studios London",
    categories: [{ categoryId: "cat_entertainment", subGenre: "Music & Soundtracks" }],
  },

  // 3. Movies
  {
    text: "Which 2019 black comedy thriller directed by Bong Joon-ho made Academy Awards history by becoming the first non-English language film to win Best Picture?",
    answerText: "Parasite (Gisaengchung)",
    difficulty: "EASY",
    status: "APPROVED",
    notes: "92nd Academy Awards (2020), also won Palme d'Or",
    categories: [{ categoryId: "cat_movies", subGenre: "World Cinema" }],
  },
  {
    text: "In Christopher Nolan's 2014 sci-fi epic Interstellar, what is the name of the gargantuan rotating supermassive black hole around which Miller's and Mann's worlds orbit?",
    answerText: "Gargantua",
    difficulty: "MEDIUM",
    status: "APPROVED",
    notes: "Astrophysics advised by Nobel laureate Kip Thorne",
    categories: [{ categoryId: "cat_movies", subGenre: "Sci-Fi Cinema" }],
  },

  // 4. History
  {
    text: "In April 1526, Zahir al-Din Muhammad Babur defeated the vastly larger army of Sultan Ibrahim Lodi at which historic battlefield, founding the Mughal Empire in northern India?",
    answerText: "First Battle of Panipat",
    difficulty: "EASY",
    status: "APPROVED",
    notes: "Notable for early use of gunpowder firearms and field artillery in India",
    categories: [{ categoryId: "cat_history", subGenre: "Indian History" }],
  },
  {
    text: "Which pair of peace treaties signed in Münster and Osnabrück in 1648 collectively ended the Thirty Years' War and established the modern concept of state sovereignty?",
    answerText: "Peace of Westphalia",
    difficulty: "HARD",
    status: "APPROVED",
    notes: "Westphalian sovereignty principle in international law",
    categories: [{ categoryId: "cat_history", subGenre: "European History" }],
  },

  // 5. Politics
  {
    text: "Which article in Part XX of the Constitution of India grants Parliament the constituent power to amend the provisions of the Constitution by way of addition, variation, or repeal?",
    answerText: "Article 368",
    difficulty: "MEDIUM",
    status: "APPROVED",
    notes: "Subject to the Basic Structure doctrine (Kesavananda Bharati case, 1973)",
    categories: [{ categoryId: "cat_politics", subGenre: "Indian Constitution" }],
  },
  {
    text: "Who was the eminent Indian diplomat and politician who made international history in 1953 by being elected the first female President of the United Nations General Assembly?",
    answerText: "Vijaya Lakshmi Pandit",
    difficulty: "HARD",
    status: "APPROVED",
    notes: "Sister of Jawaharlal Nehru; eighth session of the UNGA",
    categories: [{ categoryId: "cat_politics", subGenre: "International Diplomacy" }],
  },

  // 6. Geography
  {
    text: "Which narrow maritime passage connects the Atlantic Ocean to the Mediterranean Sea and separates the Iberian Peninsula in Europe from Morocco in North Africa?",
    answerText: "Strait of Gibraltar",
    difficulty: "EASY",
    status: "APPROVED",
    notes: "Width is approximately 14.3 km (8.9 mi) at its narrowest point",
    categories: [{ categoryId: "cat_geography", subGenre: "Physical Geography" }],
  },
  {
    text: "Straddling the high-altitude border between Peru and Bolivia in the Andes mountains, which body of water is internationally recognized as the highest navigable lake in the world?",
    answerText: "Lake Titicaca",
    difficulty: "MEDIUM",
    status: "APPROVED",
    notes: "Surface elevation of 3,812 meters (12,507 ft) above sea level",
    categories: [{ categoryId: "cat_geography", subGenre: "Lakes & Rivers" }],
  },

  // 7. World Cultures
  {
    text: "In Japanese traditional aesthetic philosophy, what paired term denotes the appreciation of beauty that is imperfect, impermanent, and incomplete, closely tied to Zen Buddhism?",
    answerText: "Wabi-sabi",
    difficulty: "MEDIUM",
    status: "APPROVED",
    notes: "Frequently manifested in traditional tea ceremony ware and kintsugi pottery",
    categories: [{ categoryId: "cat_world_cultures", subGenre: "Philosophy & Traditions" }],
  },
  {
    text: "Celebrated annually at the fortress of Sacsayhuamán in Cusco, the ancient festival of Inti Raymi honours which supreme solar deity of the Inca Empire?",
    answerText: "Inti",
    difficulty: "HARD",
    status: "APPROVED",
    notes: "Marks the winter solstice in the Southern Hemisphere (June 24)",
    categories: [{ categoryId: "cat_world_cultures", subGenre: "Ancient Mythology" }],
  },

  // 8. Science
  {
    text: "Which subatomic particle, postulated by physicists in 1964 to explain why fundamental particles have mass, was experimentally confirmed by CERN's ATLAS and CMS detectors in 2012?",
    answerText: "Higgs Boson",
    difficulty: "EASY",
    status: "APPROVED",
    notes: "Nobel Prize in Physics 2013 awarded to François Englert and Peter Higgs",
    categories: [{ categoryId: "cat_science", subGenre: "Particle Physics" }],
  },
  {
    text: "Which double-membrane-bound cellular organelle is responsible for generating the majority of the chemical energy needed to power biochemical reactions via ATP production?",
    answerText: "Mitochondrion (Mitochondria)",
    difficulty: "EASY",
    status: "APPROVED",
    notes: "Possesses its own independent circular genome (mtDNA)",
    categories: [{ categoryId: "cat_science", subGenre: "Cell Biology" }],
  },

  // 9. Technology
  {
    text: "Which cryptographic hash algorithm from the SHA-2 family, producing a 256-bit digest, was designed by the NSA in 2001 and is used as the proof-of-work algorithm in Bitcoin?",
    answerText: "SHA-256",
    difficulty: "MEDIUM",
    status: "APPROVED",
    notes: "Published in NIST FIPS 180-2",
    categories: [{ categoryId: "cat_technology", subGenre: "Cryptography" }],
  },
  {
    text: "Created by Linus Torvalds in 2005 to replace BitKeeper for Linux kernel development, which distributed version control system has become the global de-facto standard for software?",
    answerText: "Git",
    difficulty: "EASY",
    status: "APPROVED",
    notes: "Designed around a directed acyclic graph (DAG) of commit objects",
    categories: [{ categoryId: "cat_technology", subGenre: "Software Engineering" }],
  },

  // 10. Literature
  {
    text: "Which Colombian novelist was awarded the 1982 Nobel Prize in Literature for his landmark magical realist novel 'One Hundred Years of Solitude', set in the town of Macondo?",
    answerText: "Gabriel García Márquez",
    difficulty: "EASY",
    status: "APPROVED",
    notes: "Chronicles seven generations of the Buendía family",
    categories: [{ categoryId: "cat_literature", subGenre: "Magical Realism" }],
  },
  {
    text: "In George Orwell's 1949 dystopian novel 'Nineteen Eighty-Four', what is the name of the controlled language created by the totalitarian state of Oceania to eliminate thoughtcrime?",
    answerText: "Newspeak",
    difficulty: "MEDIUM",
    status: "APPROVED",
    notes: "Detailed in the famous linguistic appendix to the novel",
    categories: [{ categoryId: "cat_literature", subGenre: "Classic Fiction" }],
  },

  // 11. Arts
  {
    text: "Which Dutch post-impressionist master painted 'The Starry Night' in June 1889, depicting the view from the east-facing window of his asylum room in Saint-Rémy-de-Provence?",
    answerText: "Vincent van Gogh",
    difficulty: "EASY",
    status: "APPROVED",
    notes: "Permanent collection of the Museum of Modern Art (MoMA), New York City",
    categories: [{ categoryId: "cat_arts", subGenre: "Post-Impressionism" }],
  },
  {
    text: "Standing over 17 feet tall and carved between 1501 and 1504 from a single block of Carrara marble, which masterpiece of Renaissance sculpture by Michelangelo stands in Florence?",
    answerText: "David",
    difficulty: "EASY",
    status: "APPROVED",
    notes: "Housed in the Galleria dell'Accademia, Florence",
    categories: [{ categoryId: "cat_arts", subGenre: "Renaissance Sculpture" }],
  },

  // 12. Sports
  {
    text: "Which Spanish tennis legend won a record 14 men's singles titles at Roland Garros between 2005 and 2022, earning him the undisputed nickname 'The King of Clay'?",
    answerText: "Rafael Nadal",
    difficulty: "EASY",
    status: "APPROVED",
    notes: "Compiled an astonishing 112-4 match record at the French Open",
    categories: [{ categoryId: "cat_sports", subGenre: "Tennis" }],
  },
  {
    text: "Which legendary Sri Lankan off-spinner holds the all-time world record for the highest number of wickets taken in Test match cricket, finishing his career with exactly 800 wickets?",
    answerText: "Muttiah Muralitharan",
    difficulty: "MEDIUM",
    status: "APPROVED",
    notes: "Reached his 800th wicket with his final delivery in Test cricket against India in Galle (2010)",
    categories: [{ categoryId: "cat_sports", subGenre: "Cricket" }],
  },

  // Extra pending questions for review workflows
  {
    text: "Under the charismatic captaincy of Australian leg-spinner Shane Warne, which underdog franchise won the inaugural edition of the Indian Premier League (IPL) in 2008?",
    answerText: "Rajasthan Royals",
    difficulty: "EASY",
    status: "PENDING",
    notes: "Defeated Chennai Super Kings in the final at DY Patil Stadium",
    categories: [{ categoryId: "cat_sports", subGenre: "Cricket" }],
  },
  {
    text: "Which widely used object-oriented programming language was initiated by James Gosling at Sun Microsystems in 1991 under the original name 'Oak'?",
    answerText: "Java",
    difficulty: "MEDIUM",
    status: "PENDING",
    notes: "Named after an oak tree standing outside Gosling's office window",
    categories: [{ categoryId: "cat_technology", subGenre: "Programming Languages" }],
  },
];

async function main() {
  console.log("Seeding question bank...");

  // Find admin user to attribute submissions to
  let admin = await prisma.user.findFirst({
    where: {
      role: { name: "Admin" },
    },
  });

  if (!admin) {
    admin = await prisma.user.findFirst();
  }

  if (!admin) {
    console.error("No user found in database to assign as question submitter!");
    process.exit(1);
  }

  console.log(`Found submitter user: ${admin.email} (${admin.id})`);

  let createdCount = 0;
  for (const q of QUESTIONS_DATA) {
    // Check if question already exists by text match
    const existing = await prisma.question.findFirst({
      where: { text: q.text },
    });

    if (existing) {
      console.log(`Skipping existing: "${q.text.slice(0, 40)}..."`);
      continue;
    }

    await prisma.question.create({
      data: {
        text: q.text,
        answerText: q.answerText,
        difficulty: q.difficulty,
        notes: q.notes,
        status: q.status,
        submittedById: admin.id,
        questionCategories: {
          create: q.categories.map((c) => ({
            categoryId: c.categoryId,
            subGenre: c.subGenre,
          })),
        },
      },
    });
    createdCount++;
  }

  const total = await prisma.question.count();
  console.log(`Successfully seeded ${createdCount} questions! (Total in DB: ${total})`);
}

main()
  .catch((e) => {
    console.error("Error seeding questions:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
