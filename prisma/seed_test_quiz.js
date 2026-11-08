const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding sample test quiz for verification...");

  let admin = await prisma.user.findFirst({
    where: { role: { name: "Admin" } },
  });
  if (!admin) admin = await prisma.user.findFirst();
  if (!admin) throw new Error("No user found in database");

  const melaTheme = await prisma.quizTheme.findFirst({
    where: { name: "MELA" },
  });

  const quizTitle = "GEC Annual Fresher's Quiz 2026";
  let quiz = await prisma.quiz.findFirst({
    where: { title: quizTitle },
  });

  if (!quiz) {
    quiz = await prisma.quiz.create({
      data: {
        title: quizTitle,
        date: new Date(),
        academicYear: "2026-27",
        format: "Written Prelims + On-Stage Finals",
        mode: "IN_PERSON",
        themeId: melaTheme?.id || null,
        venueOrPlatform: "Main Auditorium, Hall B",
        timing: "4:30 PM - 7:00 PM",
        budget: 750.0,
        lessonsLearned:
          "Great turnout with 28 participating teams! Round 2 audio questions took slightly longer than planned; recommend keeping audio playback to strict 45s timers in next year's edition.",
        createdById: admin.id,
        qms: {
          create: [{ userId: admin.id }],
        },
      },
    });
    console.log(`Created sample test quiz: [${quiz.id}] "${quiz.title}"`);
  } else {
    console.log(`Test quiz already exists: [${quiz.id}] "${quiz.title}"`);
  }

  // Find 4 approved questions to populate running order
  const approvedQuestions = await prisma.question.findMany({
    where: { status: "APPROVED" },
    take: 5,
  });

  if (approvedQuestions.length > 0) {
    // Sync running order
    await prisma.usageLog.deleteMany({ where: { quizId: quiz.id } });

    const rounds = [
      "Round 1 - Written Prelims",
      "Round 1 - Written Prelims",
      "Round 2 - Stage Finals",
      "Round 2 - Stage Finals",
      "Round 2 - Stage Finals",
    ];

    for (let i = 0; i < approvedQuestions.length; i++) {
      await prisma.usageLog.create({
        data: {
          quizId: quiz.id,
          questionId: approvedQuestions[i].id,
          orderIndex: i + 1,
          roundName: rounds[i] || "Round 1",
          usedOn: quiz.date,
        },
      });
    }
    console.log(`Populated running order with ${approvedQuestions.length} questions.`);
  }

  console.log("\n--- Verification URL ---");
  console.log(`Quiz Archive:  http://localhost:3000/quizzes`);
  console.log(`Quiz Detail:   http://localhost:3000/quizzes/${quiz.id}`);
  console.log(`Quiz Builder:  http://localhost:3000/quizzes/${quiz.id}/builder`);
  console.log("------------------------\n");
}

main()
  .catch((e) => {
    console.error("Error seeding sample quiz:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
