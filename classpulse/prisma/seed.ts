import { PrismaClient, Role, AttendanceStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();
const PASSWORD = "Password123!";

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to seed demo accounts in production.");
  }
  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  const admin = await db.user.upsert({
    where: { email: "admin@classpulse.dev" },
    update: {},
    create: { email: "admin@classpulse.dev", name: "Ngozi Adeyemi", role: Role.ADMIN, passwordHash },
  });

  const teacherUser = await db.user.upsert({
    where: { email: "teacher@classpulse.dev" },
    update: {},
    create: {
      email: "teacher@classpulse.dev",
      name: "Tunde Bakare",
      role: Role.TEACHER,
      passwordHash,
      teacher: { create: { staffNo: "STF-001" } },
    },
  });

  const classes = [];
  for (const [name, arm] of [["JSS 1", "A"], ["JSS 2", "A"]]) {
    classes.push(
      await db.class.upsert({ where: { name_arm: { name, arm } }, update: {}, create: { name, arm } })
    );
  }

  const subjects = [];
  for (const [name, code] of [
    ["Mathematics", "MTH"], ["English Language", "ENG"], ["Basic Science", "BSC"], ["Civic Education", "CVE"],
  ]) {
    subjects.push(
      await db.subject.upsert({ where: { code }, update: {}, create: { name, code } })
    );
  }

  const term = await db.term.upsert({
    where: { name_session: { name: "First Term", session: "2026/2027" } },
    update: { current: true },
    create: { name: "First Term", session: "2026/2027", current: true },
  });

  // Give the demo teacher full assignments so attendance and score entry are usable immediately.
  const teacherProfile = await db.teacher.findUnique({ where: { userId: teacherUser.id } });
  if (teacherProfile) {
    for (const c of classes) {
      await db.teacherClass.upsert({
        where: { teacherId_classId: { teacherId: teacherProfile.id, classId: c.id } },
        update: {},
        create: { teacherId: teacherProfile.id, classId: c.id },
      });
      for (const subj of subjects) {
        await db.teacherSubject.upsert({
          where: { teacherId_classId_subjectId: { teacherId: teacherProfile.id, classId: c.id, subjectId: subj.id } },
          update: {},
          create: { teacherId: teacherProfile.id, classId: c.id, subjectId: subj.id },
        });
      }
    }
  }

  const parentUser = await db.user.upsert({
    where: { email: "parent@classpulse.dev" },
    update: {},
    create: {
      email: "parent@classpulse.dev",
      name: "Chinedu Okafor",
      role: Role.PARENT,
      passwordHash,
      parent: { create: { phone: "08030000000" } },
    },
    include: { parent: true },
  });

  const roster = [
    ["Amaka Okafor", "F", 0, true],
    ["Ibrahim Musa", "M", 0, false],
    ["Folake Williams", "F", 0, false],
    ["Emeka Nwosu", "M", 1, false],
    ["Zainab Bello", "F", 1, false],
    ["David Eze", "M", 1, false],
  ] as const;

  const students = [];
  let n = 1;
  for (const [name, gender, ci, isChildOfParent] of roster) {
    const admissionNo = `CP/26/${String(n).padStart(3, "0")}`;
    const email = n === 1 ? "student@classpulse.dev" : `student${n}@classpulse.dev`;
    const existing = await db.student.findUnique({ where: { admissionNo } });
    if (existing) { students.push(existing); n++; continue; }
    const user = await db.user.create({
      data: { email, name, role: Role.STUDENT, passwordHash },
    });
    students.push(
      await db.student.create({
        data: {
          userId: user.id,
          admissionNo,
          gender,
          classId: classes[ci].id,
          parentId: isChildOfParent ? parentUser.parent!.id : null,
        },
      })
    );
    n++;
  }

  // Scores
  for (const s of students) {
    for (const subj of subjects) {
      await db.score.upsert({
        where: { studentId_subjectId_termId: { studentId: s.id, subjectId: subj.id, termId: term.id } },
        update: {},
        create: {
          studentId: s.id, subjectId: subj.id, termId: term.id,
          ca1: 10 + Math.floor(Math.random() * 10),
          ca2: 10 + Math.floor(Math.random() * 10),
          exam: 25 + Math.floor(Math.random() * 35),
        },
      });
    }
  }

  // Attendance (last 5 weekdays)
  const today = new Date();
  for (let d = 0; d < 7; d++) {
    const date = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate() - d));
    const dow = date.getUTCDay();
    if (dow === 0 || dow === 6) continue;
    for (const s of students) {
      const r = Math.random();
      const status = r < 0.85 ? AttendanceStatus.PRESENT : r < 0.93 ? AttendanceStatus.LATE : AttendanceStatus.ABSENT;
      await db.attendance.upsert({
        where: { studentId_date: { studentId: s.id, date } },
        update: {},
        create: { studentId: s.id, date, status },
      });
    }
  }

  // Fees
  if ((await db.feeItem.count()) === 0) {
    const tuition = await db.feeItem.create({ data: { title: "Tuition", amount: 85000, termId: term.id } });
    await db.feeItem.create({ data: { title: "Textbooks", amount: 18000, termId: term.id } });
    await db.feeItem.create({ data: { title: "Sports & Excursion", amount: 7500, termId: term.id } });
    await db.payment.create({
      data: { studentId: students[0].id, feeItemId: tuition.id, amount: 50000, reference: "PAY-SEED-0001" },
    });
  }

  // Announcements
  if ((await db.announcement.count()) === 0) {
    await db.announcement.createMany({
      data: [
        { title: "Welcome to First Term", body: "Classes resume Monday. Please make sure uniforms and textbooks are complete.", authorId: admin.id },
        { title: "Mid-term break", body: "Mid-term break holds next Thursday and Friday. School reopens Monday.", authorId: admin.id },
        { title: "Staff meeting", body: "All teachers: meeting in the staff room on Friday at 2pm.", audience: Role.TEACHER, authorId: teacherUser.id },
      ],
    });
  }

  console.log("Seeded. Login with any of these (password: %s):", PASSWORD);
  console.log("  admin@classpulse.dev | teacher@classpulse.dev | parent@classpulse.dev | student@classpulse.dev");
}

main().finally(() => db.$disconnect());
