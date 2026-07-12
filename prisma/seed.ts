import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/db";

const ADMIN_EMAIL = "admin@assetflow.local";
const ADMIN_PASSWORD = "ChangeMe123!";
const ADMIN_NAME = "AssetFlow Admin";

const DEMO_PASSWORD = "ChangeMe123!";

async function seedAdmin() {
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  const admin = await prisma.employee.upsert({
    where: { email: ADMIN_EMAIL },
    update: {},
    create: {
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      passwordHash,
      role: "ADMIN",
    },
  });

  console.log("Seeded Admin employee for local testing:");
  console.log(`  email:    ${ADMIN_EMAIL}`);
  console.log(`  password: ${ADMIN_PASSWORD}`);

  return admin;
}

/**
 * Cross-role demo data so the dashboard isn't all zeros: departments, one
 * employee per role, a mixed-status asset pool, an overdue allocation, an
 * upcoming-return allocation, an ongoing booking, a pending transfer, and a
 * few ActivityLog rows beyond ROLE_CHANGE. Guarded by a marker-employee
 * lookup so re-running `prisma db seed` doesn't duplicate rows.
 */
async function seedDemoData() {
  const existing = await prisma.employee.findUnique({
    where: { email: "priya.shah@assetflow.local" },
  });
  if (existing) {
    console.log("Demo data already seeded, skipping.");
    return;
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const now = Date.now();
  const DAY_MS = 24 * 60 * 60 * 1000;

  const itDept = await prisma.department.create({ data: { name: "IT" } });
  const opsDept = await prisma.department.create({
    data: { name: "Operations" },
  });

  const electronics = await prisma.assetCategory.create({
    data: { name: "Electronics" },
  });
  const facilities = await prisma.assetCategory.create({
    data: { name: "Facilities" },
  });

  const assetManager = await prisma.employee.create({
    data: {
      name: "Rahul Verma",
      email: "rahul.verma@assetflow.local",
      passwordHash,
      role: "ASSET_MANAGER",
      departmentId: opsDept.id,
    },
  });

  const deptHead = await prisma.employee.create({
    data: {
      name: "Priya Shah",
      email: "priya.shah@assetflow.local",
      passwordHash,
      role: "DEPARTMENT_HEAD",
      departmentId: itDept.id,
    },
  });
  await prisma.department.update({
    where: { id: itDept.id },
    data: { headId: deptHead.id },
  });

  const employee = await prisma.employee.create({
    data: {
      name: "Sara Khan",
      email: "sara.khan@assetflow.local",
      passwordHash,
      role: "EMPLOYEE",
      departmentId: itDept.id,
    },
  });

  const opsEmployee = await prisma.employee.create({
    data: {
      name: "Karan Mehta",
      email: "karan.mehta@assetflow.local",
      passwordHash,
      role: "EMPLOYEE",
      departmentId: opsDept.id,
    },
  });

  const laptop = await prisma.asset.create({
    data: {
      assetTag: "AF-0114",
      name: "Laptop",
      status: "ALLOCATED",
      categoryId: electronics.id,
    },
  });
  const monitor = await prisma.asset.create({
    data: {
      assetTag: "AF-0512",
      name: "Monitor",
      status: "ALLOCATED",
      categoryId: electronics.id,
    },
  });
  const projector = await prisma.asset.create({
    data: {
      assetTag: "AF-0062",
      name: "Projector",
      status: "AVAILABLE",
      categoryId: electronics.id,
    },
  });
  await prisma.asset.create({
    data: {
      assetTag: "AF-0305",
      name: "Printer",
      status: "UNDER_MAINTENANCE",
      categoryId: electronics.id,
    },
  });
  await prisma.asset.create({
    data: {
      assetTag: "AF-0201",
      name: "Standing Desk",
      status: "AVAILABLE",
      categoryId: facilities.id,
    },
  });
  const roomB2 = await prisma.asset.create({
    data: {
      assetTag: "AF-ROOM-B2",
      name: "Room B2",
      status: "AVAILABLE",
      categoryId: facilities.id,
    },
  });

  // Overdue: expected back 3 days ago.
  const laptopAllocation = await prisma.allocation.create({
    data: {
      assetId: laptop.id,
      employeeId: employee.id,
      status: "ACTIVE",
      expectedReturnDate: new Date(now - 3 * DAY_MS),
    },
  });

  // Upcoming return: due in 3 days (within the 7-day window).
  await prisma.allocation.create({
    data: {
      assetId: monitor.id,
      employeeId: employee.id,
      status: "ACTIVE",
      expectedReturnDate: new Date(now + 3 * DAY_MS),
    },
  });

  // Ongoing booking: window straddles "now".
  const booking = await prisma.booking.create({
    data: {
      assetId: roomB2.id,
      bookedById: employee.id,
      startsAt: new Date(now - 30 * 60 * 1000),
      endsAt: new Date(now + 30 * 60 * 1000),
    },
  });

  // Pending transfer request: Sara -> Karan.
  await prisma.transfer.create({
    data: {
      allocationId: laptopAllocation.id,
      fromEmployeeId: employee.id,
      toEmployeeId: opsEmployee.id,
      status: "REQUESTED",
    },
  });

  await prisma.activityLog.createMany({
    data: [
      {
        actorId: assetManager.id,
        action: "ALLOCATION_CREATED",
        targetId: laptop.id,
        targetType: "Asset",
        metadata: {
          assetTag: laptop.assetTag,
          employeeName: employee.name,
          departmentName: itDept.name,
        },
        createdAt: new Date(now - 3 * 60 * 60 * 1000),
      },
      {
        actorId: employee.id,
        action: "BOOKING_CONFIRMED",
        targetId: booking.id,
        targetType: "Booking",
        metadata: {
          resourceName: roomB2.name,
          startsAt: "2:00 PM",
          endsAt: "3:00 PM",
        },
        createdAt: new Date(now - 2 * 60 * 60 * 1000),
      },
      {
        actorId: assetManager.id,
        action: "MAINTENANCE_RESOLVED",
        targetId: projector.id,
        targetType: "Asset",
        metadata: { assetTag: projector.assetTag },
        createdAt: new Date(now - 60 * 60 * 1000),
      },
    ],
  });

  console.log("Seeded demo data across roles:");
  console.log(`  department head: priya.shah@assetflow.local / ${DEMO_PASSWORD}`);
  console.log(`  asset manager:   rahul.verma@assetflow.local / ${DEMO_PASSWORD}`);
  console.log(`  employee (IT):   sara.khan@assetflow.local / ${DEMO_PASSWORD}`);
  console.log(`  employee (Ops):  karan.mehta@assetflow.local / ${DEMO_PASSWORD}`);
  console.log(`  printer AF-0305 left UNDER_MAINTENANCE (unresolved, on purpose)`);
}

async function main() {
  await seedAdmin();
  await seedDemoData();
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
