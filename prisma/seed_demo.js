const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const DEMO_CATEGORIES = [
  { id: "cat_pop_culture", name: "Pop Culture" },
  { id: "cat_entertainment", name: "Entertainment" },
  { id: "cat_movies", name: "Movies & Cinema" },
  { id: "cat_tech_sci", name: "Science & Technology" },
  { id: "cat_history", name: "History & Heritage" },
  { id: "cat_sports", name: "Sports & Games" },
  { id: "cat_lit", name: "Literature & Arts" },
  { id: "cat_general", name: "General Knowledge" },
];

const DEMO_PERMISSIONS = [
  { id: "perm_manage_users", key: "manage_users", label: "Manage Users", description: "Approve, deny, revoke, and manage roles" },
  { id: "perm_manage_categories", key: "manage_categories", label: "Manage Categories", description: "Create and edit question categories" },
  { id: "perm_manage_questions", key: "manage_questions", label: "Manage Questions", description: "Approve, reject, and edit any question in pool" },
  { id: "perm_view_full_pool", key: "view_full_pool", label: "View Full Pool", description: "View all submitted and approved questions" },
  { id: "perm_build_quizzes", key: "build_quizzes", label: "Build Quizzes", description: "Create quizzes, running orders, and score tournaments" },
];

const DEMO_QUESTIONS = [
  {
    text: "Which fictional company with the slogan 'Products from across the globe, delivered in a box' was founded by Gavin Belson in HBO's Silicon Valley?",
    answerText: "Hooli",
    difficulty: "MEDIUM",
    status: "APPROVED",
    notes: "Appears throughout Seasons 1-6.",
    categoryId: "cat_pop_culture",
    subGenre: "TV & Streaming",
  },
  {
    text: "In the Marvel Cinematic Universe, what is the pocket dimension inside the Soul Stone where Thanos encounters young Gamora after the snap?",
    answerText: "Soulworld (Soul Dimension)",
    difficulty: "HARD",
    status: "APPROVED",
    notes: "Avengers: Infinity War (2018)",
    categoryId: "cat_movies",
    subGenre: "Comic Adaptations",
  },
  {
    text: "Which 1994 animated Disney film was originally developed under the working title 'King of the Jungle' before realizing the animals lived in savannah grasslands?",
    answerText: "The Lion King",
    difficulty: "EASY",
    status: "APPROVED",
    notes: "Directed by Roger Allers and Rob Minkoff",
    categoryId: "cat_entertainment",
    subGenre: "Animation",
  },
  {
    text: "Which French electronic music duo composed the entire 22-track original electronic-orchestral score for the 2010 sci-fi film Tron: Legacy?",
    answerText: "Daft Punk",
    difficulty: "MEDIUM",
    status: "APPROVED",
    notes: "Guy-Manuel de Homem-Christo and Thomas Bangalter.",
    categoryId: "cat_entertainment",
    subGenre: "Film Scores",
  },
  {
    text: "Which programming language was developed by Guido van Rossum in 1989 and named after a BBC comedy sketch show?",
    answerText: "Python (named after Monty Python's Flying Circus)",
    difficulty: "EASY",
    status: "APPROVED",
    notes: "First released in 1991.",
    categoryId: "cat_tech_sci",
    subGenre: "Computer Science",
  },
  {
    text: "What mathematical constant is defined as the ratio of a circle's circumference to its diameter?",
    answerText: "Pi (π)",
    difficulty: "EASY",
    status: "APPROVED",
    notes: "Approximated as 3.14159 or 22/7.",
    categoryId: "cat_tech_sci",
    subGenre: "Mathematics",
  },
  {
    text: "Which British computer scientist formulated the concept of computation with his eponymous abstract machine and cracked the Enigma cipher at Bletchley Park?",
    answerText: "Alan Turing",
    difficulty: "MEDIUM",
    status: "APPROVED",
    notes: "Considered the father of theoretical computer science & AI.",
    categoryId: "cat_history",
    subGenre: "World War II & Computing",
  },
  {
    text: "Which 2019 black comedy thriller directed by Bong Joon-ho became the first non-English language film to win the Academy Award for Best Picture?",
    answerText: "Parasite (Gisaengchung)",
    difficulty: "EASY",
    status: "APPROVED",
    notes: "Also won the Palme d'Or at Cannes.",
    categoryId: "cat_movies",
    subGenre: "World Cinema",
  },
  {
    text: "In Formula 1, which circuit features the famous corners Eau Rouge and Raidillon?",
    answerText: "Circuit de Spa-Francorchamps (Belgium)",
    difficulty: "MEDIUM",
    status: "APPROVED",
    notes: "Stavelot, Belgium.",
    categoryId: "cat_sports",
    subGenre: "Motorsport",
  },
  {
    text: "Which literary character resides at 221B Baker Street in London, accompanied by his biographer Dr. John H. Watson?",
    answerText: "Sherlock Holmes",
    difficulty: "EASY",
    status: "APPROVED",
    notes: "Created by Sir Arthur Conan Doyle in 1887.",
    categoryId: "cat_lit",
    subGenre: "Classic Detective Fiction",
  },
  {
    text: "What astronomical term describes the boundary around a black hole beyond which nothing, not even light, can escape?",
    answerText: "Event Horizon",
    difficulty: "MEDIUM",
    status: "APPROVED",
    notes: "Related to the Schwarzschild radius.",
    categoryId: "cat_tech_sci",
    subGenre: "Astrophysics",
  },
  {
    text: "In competitive chess, what is the term for a move where the king moves two squares towards a rook, and the rook moves to the square the king crossed?",
    answerText: "Castling",
    difficulty: "EASY",
    status: "APPROVED",
    notes: "The only move allowing two pieces to move simultaneously.",
    categoryId: "cat_sports",
    subGenre: "Board Games",
  },
  {
    text: "Which treaty signed in 1919 officially ended World War I between Germany and the Allied Powers?",
    answerText: "Treaty of Versailles",
    difficulty: "MEDIUM",
    status: "APPROVED",
    notes: "Signed in the Hall of Mirrors at Versailles Palace.",
    categoryId: "cat_history",
    subGenre: "Modern History",
  },
  {
    text: "Which Japanese video game designer created the Legend of Zelda, Super Mario, and Donkey Kong franchises for Nintendo?",
    answerText: "Shigeru Miyamoto",
    difficulty: "EASY",
    status: "APPROVED",
    notes: "Often referred to as the 'father of modern video gaming'.",
    categoryId: "cat_pop_culture",
    subGenre: "Gaming History",
  },
  {
    text: "What is the only country in the world that is also considered an entire continent?",
    answerText: "Australia",
    difficulty: "EASY",
    status: "APPROVED",
    notes: "Surrounded by the Indian and Pacific oceans.",
    categoryId: "cat_general",
    subGenre: "Geography",
  },
  {
    text: "Which ancient wonder of the world located in Alexandria, Egypt, was destroyed by several earthquakes between 956 and 1323 AD?",
    answerText: "Lighthouse of Alexandria (Pharos of Alexandria)",
    difficulty: "HARD",
    status: "APPROVED",
    notes: "Estimated between 100 and 130 meters tall.",
    categoryId: "cat_history",
    subGenre: "Ancient Civilizations",
  },
  {
    text: "What is the highest-grossing film of all time worldwide, not adjusted for inflation?",
    answerText: "Avatar (2009)",
    difficulty: "EASY",
    status: "APPROVED",
    notes: "Directed by James Cameron, surpassed $2.9 billion.",
    categoryId: "cat_movies",
    subGenre: "Box Office",
  },
  {
    text: "Which chemical element has the highest melting point of all known pure metals at 3,422 °C (6,192 °F)?",
    answerText: "Tungsten (Wolfram, W)",
    difficulty: "HARD",
    status: "APPROVED",
    notes: "Atomic number 74.",
    categoryId: "cat_tech_sci",
    subGenre: "Chemistry",
  },
  {
    text: "Which classic novel by George Orwell introduces the concept of Thought Police, Doublethink, and Room 101?",
    answerText: "Nineteen Eighty-Four (1984)",
    difficulty: "EASY",
    status: "APPROVED",
    notes: "Published in 1949.",
    categoryId: "cat_lit",
    subGenre: "Dystopian Literature",
  },
  {
    text: "In football (soccer), which nation has won the FIFA World Cup the most times?",
    answerText: "Brazil (5 titles - 1958, 1962, 1970, 1994, 2002)",
    difficulty: "EASY",
    status: "APPROVED",
    notes: "Pele is the only player to have won 3 World Cups.",
    categoryId: "cat_sports",
    subGenre: "Football",
  },
];

async function seed() {
  console.log("🚀 Starting Showcase Database Seeding...");

  // 1. Seed Categories
  for (const cat of DEMO_CATEGORIES) {
    await prisma.category.upsert({
      where: { id: cat.id },
      update: { name: cat.name },
      create: cat,
    });
  }
  console.log(`✅ Seeded ${DEMO_CATEGORIES.length} Categories.`);

  // 2. Seed Permissions
  for (const perm of DEMO_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { id: perm.id },
      update: { label: perm.label, description: perm.description },
      create: perm,
    });
  }
  console.log(`✅ Seeded ${DEMO_PERMISSIONS.length} Permissions.`);

  // 3. Seed Roles
  const adminRole = await prisma.role.upsert({
    where: { name: "Admin" },
    update: { isSystem: true },
    create: { name: "Admin", isSystem: true, sortOrder: 1 },
  });

  const qmRole = await prisma.role.upsert({
    where: { name: "Head of Quizzing" },
    update: { isSystem: true },
    create: { name: "Head of Quizzing", isSystem: true, sortOrder: 2 },
  });

  const memberRole = await prisma.role.upsert({
    where: { name: "Member" },
    update: { isSystem: true },
    create: { name: "Member", isSystem: true, sortOrder: 10 },
  });

  // Assign permissions to roles
  const allPerms = await prisma.permission.findMany();
  for (const p of allPerms) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: adminRole.id, permissionId: p.id } },
      update: {},
      create: { roleId: adminRole.id, permissionId: p.id },
    });
  }

  // Head of Quizzing gets manage_questions, view_full_pool, build_quizzes
  const qmPermKeys = ["manage_questions", "view_full_pool", "build_quizzes"];
  for (const p of allPerms.filter((p) => qmPermKeys.includes(p.key))) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: qmRole.id, permissionId: p.id } },
      update: {},
      create: { roleId: qmRole.id, permissionId: p.id },
    });
  }
  console.log("✅ Seeded Roles and Role-Permission mappings.");

  // 4. Seed Demo Users
  const demoAdmin = await prisma.user.upsert({
    where: { email: "demo.admin@quizclub.dev" },
    update: { roleId: adminRole.id, status: "ACTIVE", name: "Demo Admin" },
    create: {
      email: "demo.admin@quizclub.dev",
      name: "Demo Admin",
      roleId: adminRole.id,
      status: "ACTIVE",
    },
  });

  const demoQm = await prisma.user.upsert({
    where: { email: "demo.quizmaster@quizclub.dev" },
    update: { roleId: qmRole.id, status: "ACTIVE", name: "Demo Quizmaster" },
    create: {
      email: "demo.quizmaster@quizclub.dev",
      name: "Demo Quizmaster",
      roleId: qmRole.id,
      status: "ACTIVE",
    },
  });

  const demoMember = await prisma.user.upsert({
    where: { email: "demo.member@quizclub.dev" },
    update: { roleId: memberRole.id, status: "ACTIVE", name: "Demo Member" },
    create: {
      email: "demo.member@quizclub.dev",
      name: "Demo Member",
      roleId: memberRole.id,
      status: "ACTIVE",
    },
  });
  console.log("✅ Seeded 3 Demo Persona Users.");

  // 5. Seed Questions
  const createdQuestions = [];
  for (const q of DEMO_QUESTIONS) {
    const existing = await prisma.question.findFirst({ where: { text: q.text } });
    if (!existing) {
      const created = await prisma.question.create({
        data: {
          text: q.text,
          answerText: q.answerText,
          difficulty: q.difficulty,
          status: q.status,
          notes: q.notes,
          submittedById: demoMember.id,
          questionCategories: {
            create: {
              categoryId: q.categoryId,
              subGenre: q.subGenre,
            },
          },
        },
      });
      createdQuestions.push(created);
    } else {
      createdQuestions.push(existing);
    }
  }
  console.log(`✅ Seeded ${createdQuestions.length} Trivia Questions.`);

  // 6. Seed Sample Quiz Tournaments
  // Quiz 1: Completed Tournament with live scores
  const quiz1 = await prisma.quiz.upsert({
    where: { id: "demo-quiz-invitational-2026" },
    update: {},
    create: {
      id: "demo-quiz-invitational-2026",
      title: "Inter-College Invitational Trivia Cup 2026",
      description: "Annual multi-round general knowledge & pop culture tournament.",
      status: "COMPLETED",
      createdById: demoAdmin.id,
      qms: {
        create: { userId: demoQm.id },
      },
    },
  });

  // Quiz 2: Active Upcoming Tournament ready for check-in
  const quiz2 = await prisma.quiz.upsert({
    where: { id: "demo-quiz-championship-2026" },
    update: {},
    create: {
      id: "demo-quiz-championship-2026",
      title: "Science, Cinema & Pop Culture Championship",
      description: "Main season tournament featuring team registration desk and running order.",
      status: "CONFIRMED",
      createdById: demoQm.id,
      qms: {
        create: { userId: demoQm.id },
      },
    },
  });
  console.log("✅ Seeded 2 Tournaments (Invitational Cup & Pop Culture Championship).");

  // 7. Seed Sample Participants & Teams for Quiz 2
  const sampleTeams = [
    { name: "Quantum Quizzers", seat: 1, members: ["Ada Lovelace", "Charles Babbage"] },
    { name: "The Fellowship of Trivia", seat: 2, members: ["Frodo Baggins", "Samwise Gamgee"] },
    { name: "Schrodinger's Answers", seat: 3, members: ["Erwin Schrodinger", "Werner Heisenberg"] },
    { name: "Enigma Decoders", seat: 4, members: ["Alan Turing", "Joan Clarke"] },
    { name: "Baker Street Irregulars", seat: 5, members: ["John Watson", "Mycroft Holmes"] },
    { name: "The Hitchhikers", seat: 6, members: ["Arthur Dent", "Ford Prefect"] },
  ];

  for (const t of sampleTeams) {
    const roster = await prisma.quizRoster.upsert({
      where: { id: `roster-${quiz2.id}-${t.seat}` },
      update: {},
      create: {
        id: `roster-${quiz2.id}-${t.seat}`,
        quizId: quiz2.id,
        teamName: t.name,
        seatNo: t.seat,
        status: "CONFIRMED",
      },
    });

    for (const m of t.members) {
      const email = `${m.toLowerCase().replace(/[^a-z0-9]/g, "")}@example.com`;
      const participant = await prisma.participant.upsert({
        where: { email },
        update: {},
        create: {
          name: m,
          email,
          college: "Tech & Arts Institute",
        },
      });

      await prisma.teamMember.upsert({
        where: { id: `tm-${roster.id}-${participant.id}` },
        update: {},
        create: {
          id: `tm-${roster.id}-${participant.id}`,
          quizId: quiz2.id,
          rosterId: roster.id,
          participantId: participant.id,
        },
      });
    }
  }
  console.log("✅ Seeded Roster and Team registrations for Active Tournament.");

  console.log("\n🎉 Showcase Database Seeding Completed Successfully!");
}

seed()
  .catch((e) => {
    console.error("Error seeding showcase data:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
