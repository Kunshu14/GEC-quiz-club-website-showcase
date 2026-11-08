const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  console.log("Starting test duplicates and rejected question seed...");

  // 1. Get submitter user
  let submitter = await prisma.user.findFirst({
    where: { role: { name: "Admin" } },
  });
  if (!submitter) {
    submitter = await prisma.user.findFirst();
  }
  if (!submitter) {
    throw new Error("No user found in database to assign as submitter.");
  }
  console.log(`Using submitter: ${submitter.name || submitter.email} (${submitter.id})`);

  // 2. Find or create canonical Gargantua question
  let gargantua = await prisma.question.findFirst({
    where: { text: { contains: "Gargantua" }, status: "APPROVED" },
  });

  if (!gargantua) {
    console.log("Canonical Gargantua question not found, creating it as APPROVED...");
    gargantua = await prisma.question.create({
      data: {
        text: "In Christopher Nolan's 2014 sci-fi epic Interstellar, what is the name of the gargantuan rotating supermassive black hole around which Miller's and Mann's worlds orbit?",
        answerText: "Gargantua",
        difficulty: "MEDIUM",
        status: "APPROVED",
        notes: "Astrophysics advised by Nobel laureate Kip Thorne. Depicts gravitational lensing and time dilation.",
        submittedById: submitter.id,
        questionCategories: {
          create: [{ categoryId: "cat_movies", subGenre: "Sci-Fi Cinema" }],
        },
      },
    });
  }
  console.log(`Canonical question for cluster: [${gargantua.id}] "${gargantua.text.slice(0, 60)}..."`);

  // 3. Create or find the REJECTED question (Pluto)
  const rejectedText = "Which planetary body in our solar system was reclassified as a dwarf planet by the International Astronomical Union in August 2006?";
  let rejectedQuestion = await prisma.question.findFirst({
    where: { text: rejectedText },
  });

  if (!rejectedQuestion) {
    rejectedQuestion = await prisma.question.create({
      data: {
        text: rejectedText,
        answerText: "Pluto",
        difficulty: "EASY",
        status: "REJECTED",
        notes: "Rejected by council: Standard school-level trivia; lacks distinctive lateral puzzle angle.",
        submittedById: submitter.id,
        questionCategories: {
          create: [{ categoryId: "cat_science", subGenre: "Astronomy" }],
        },
      },
    });
    console.log(`Created REJECTED question: [${rejectedQuestion.id}] "${rejectedQuestion.text.slice(0, 50)}..."`);
  } else {
    // Ensure it is set to REJECTED
    rejectedQuestion = await prisma.question.update({
      where: { id: rejectedQuestion.id },
      data: { status: "REJECTED" },
    });
    console.log(`Existing question found and updated to REJECTED: [${rejectedQuestion.id}]`);
  }

  // 4. Create 3 FLAGGED Duplicate questions
  const duplicatesToSeed = [
    {
      text: "Which fictional supermassive black hole was visually rendered using Kip Thorne's equations in Christopher Nolan's 2014 sci-fi film Interstellar?",
      answerText: "Gargantua",
      difficulty: "MEDIUM",
      status: "FLAGGED",
      duplicateOfId: gargantua.id,
      duplicateScore: 0.68,
      notes: `Flagged by duplicate detection engine (Score: 68%) against approved question: "${gargantua.text.slice(0, 60)}..."`,
      category: { categoryId: "cat_movies", subGenre: "Sci-Fi Cinema" },
    },
    {
      text: "Name the giant black hole with an accretion disk depicted in Christopher Nolan's movie Interstellar.",
      answerText: "Gargantua",
      difficulty: "MEDIUM",
      status: "FLAGGED",
      duplicateOfId: gargantua.id,
      duplicateScore: 0.52,
      notes: `Flagged by duplicate detection engine (Score: 52%) against approved question: "${gargantua.text.slice(0, 60)}..."`,
      category: { categoryId: "cat_movies", subGenre: "Sci-Fi Cinema" },
    },
    {
      text: "In August 2006, which ninth planet from the Sun was demoted to dwarf planet status by the International Astronomical Union?",
      answerText: "Pluto",
      difficulty: "EASY",
      status: "FLAGGED",
      duplicateOfId: rejectedQuestion.id,
      duplicateScore: 0.64,
      notes: `Flagged by duplicate detection engine (Score: 64%) against previously rejected question: "${rejectedQuestion.text.slice(0, 60)}..."`,
      category: { categoryId: "cat_science", subGenre: "Astronomy" },
    },
  ];

  for (let i = 0; i < duplicatesToSeed.length; i++) {
    const item = duplicatesToSeed[i];
    const existing = await prisma.question.findFirst({
      where: { text: item.text },
    });

    if (existing) {
      const updated = await prisma.question.update({
        where: { id: existing.id },
        data: {
          status: item.status,
          duplicateOfId: item.duplicateOfId,
          duplicateScore: item.duplicateScore,
          notes: item.notes,
        },
      });
      console.log(`Updated existing duplicate question #${i + 1}: [${updated.id}] "${updated.text.slice(0, 50)}..."`);
    } else {
      const created = await prisma.question.create({
        data: {
          text: item.text,
          answerText: item.answerText,
          difficulty: item.difficulty,
          status: item.status,
          duplicateOfId: item.duplicateOfId,
          duplicateScore: item.duplicateScore,
          notes: item.notes,
          submittedById: submitter.id,
          questionCategories: {
            create: [item.category],
          },
        },
      });
      console.log(`Created FLAGGED duplicate question #${i + 1}: [${created.id}] "${created.text.slice(0, 50)}..."`);
    }
  }

  // Summary counts
  const totalQuestions = await prisma.question.count();
  const flaggedCount = await prisma.question.count({ where: { status: "FLAGGED" } });
  const rejectedCount = await prisma.question.count({ where: { status: "REJECTED" } });
  const approvedCount = await prisma.question.count({ where: { status: "APPROVED" } });

  console.log("\n--- DB Summary ---");
  console.log(`Total questions: ${totalQuestions}`);
  console.log(`Approved: ${approvedCount}`);
  console.log(`Flagged (Duplicates): ${flaggedCount}`);
  console.log(`Rejected: ${rejectedCount}`);
  console.log("------------------\n");

  const flaggedList = await prisma.question.findMany({
    where: { status: "FLAGGED" },
    include: { duplicateOf: true },
  });

  console.log("=== FLAGGED QUESTIONS IN DB ===");
  for (const f of flaggedList) {
    console.log(`[FLAGGED ID: ${f.id}]`);
    console.log(`  Candidate Text: "${f.text}"`);
    console.log(`  Similarity Score: ${(f.duplicateScore * 100).toFixed(0)}%`);
    console.log(`  Duplicate Of Target: [${f.duplicateOf?.id}] (${f.duplicateOf?.status}) "${f.duplicateOf?.text}"`);
    console.log("---");
  }
}

main()
  .catch((e) => {
    console.error("Error during test seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
