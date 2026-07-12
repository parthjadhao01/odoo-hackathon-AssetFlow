import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/db";
import { Prisma } from "../src/generated/prisma/client";

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
      serialNumber: "AST-SN-0114",
      acquisitionDate: new Date(now - 200 * DAY_MS),
      acquisitionCost: 95000,
      condition: "Good",
      location: "Bengaluru",
      // Matches the Electronics `extraFields` set further below (assets
      // spec §3.2's category-specific captured values).
      extraValues: { warrantyMonths: 24, serialNumber: "SN-88213" },
    },
  });
  const monitor = await prisma.asset.create({
    data: {
      assetTag: "AF-0512",
      name: "Monitor",
      status: "ALLOCATED",
      categoryId: electronics.id,
      location: "Bengaluru",
      condition: "Good",
    },
  });
  const projector = await prisma.asset.create({
    data: {
      assetTag: "AF-0062",
      name: "Projector",
      status: "AVAILABLE",
      categoryId: electronics.id,
      location: "HQ floor 2",
      condition: "Fair",
    },
  });
  await prisma.asset.create({
    data: {
      assetTag: "AF-0305",
      name: "Printer",
      status: "UNDER_MAINTENANCE",
      categoryId: electronics.id,
      location: "HQ floor 2",
      condition: "Poor",
    },
  });
  await prisma.asset.create({
    data: {
      assetTag: "AF-0201",
      name: "Standing Desk",
      status: "AVAILABLE",
      categoryId: facilities.id,
      location: "Warehouse",
      condition: "Good",
    },
  });
  const roomB2 = await prisma.asset.create({
    data: {
      assetTag: "AF-ROOM-B2",
      name: "Room B2",
      status: "AVAILABLE",
      categoryId: facilities.id,
      location: "HQ floor 3",
      condition: "Good",
      bookable: true,
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

  // Resolved maintenance request on the projector — demoes the Assets
  // screen's per-asset maintenance history (assets spec §6) alongside the
  // MAINTENANCE_RESOLVED activity log entry below.
  await prisma.maintenanceRequest.create({
    data: {
      assetId: projector.id,
      raisedById: employee.id,
      description: "Bulb replacement needed",
      status: "RESOLVED",
      decidedAt: new Date(now - 5 * DAY_MS),
      resolvedAt: new Date(now - 4 * DAY_MS),
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

  // Org Setup demo data (spec 04-organization, mockup "Screen 3"): a
  // parent/child department pair with the child INACTIVE, a head on that
  // inactive child, a separately-deactivated employee, and extraFields on
  // Electronics — so all three Organization Setup tabs demo non-trivially.
  const fieldOps = await prisma.department.create({ data: { name: "Field Ops" } });
  const fieldOpsHead = await prisma.employee.create({
    data: {
      name: "Sana Iqbal",
      email: "sana.iqbal@assetflow.local",
      passwordHash,
      role: "EMPLOYEE",
    },
  });
  await prisma.department.create({
    data: {
      name: "Field Ops (East)",
      status: "INACTIVE",
      parentDeptId: fieldOps.id,
      headId: fieldOpsHead.id,
    },
  });

  await prisma.employee.create({
    data: {
      name: "Vikram Nair",
      email: "vikram.nair@assetflow.local",
      passwordHash,
      role: "EMPLOYEE",
      status: "INACTIVE",
    },
  });

  await prisma.assetCategory.update({
    where: { id: electronics.id },
    data: {
      extraFields: [
        { key: "warrantyMonths", label: "Warranty (months)", type: "number", required: false },
        { key: "serialNumber", label: "Serial number", type: "text", required: true },
      ],
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
  console.log(`  Field Ops (East) seeded INACTIVE under Field Ops, headed by sana.iqbal@assetflow.local`);
  console.log(`  vikram.nair@assetflow.local seeded INACTIVE for directory demo`);
}

/**
 * Backfills the assets-screen fields (location/condition/serialNumber/
 * bookable/extraValues) and the projector's maintenance history row onto
 * demo data seeded by an earlier run of this script, before those columns
 * existed. No-ops on a fresh DB (`seedDemoData` already sets them there) and
 * is idempotent on repeat runs.
 */
async function backfillAssetRegistrationDemoData() {
  // Same gap as the asset rows below: `seedDemoData`'s early-return guard
  // means this update never ran on a DB seeded before this field existed.
  await prisma.assetCategory.updateMany({
    where: { name: "Electronics", extraFields: { equals: Prisma.JsonNull } },
    data: {
      extraFields: [
        { key: "warrantyMonths", label: "Warranty (months)", type: "number", required: false },
        { key: "serialNumber", label: "Serial number", type: "text", required: true },
      ],
    },
  });

  const updates: [string, Prisma.AssetUpdateInput][] = [
    [
      "AF-0114",
      {
        serialNumber: "AST-SN-0114",
        location: "Bengaluru",
        condition: "Good",
        extraValues: { warrantyMonths: 24, serialNumber: "SN-88213" },
      },
    ],
    ["AF-0512", { location: "Bengaluru", condition: "Good" }],
    ["AF-0062", { location: "HQ floor 2", condition: "Fair" }],
    ["AF-0305", { location: "HQ floor 2", condition: "Poor" }],
    ["AF-0201", { location: "Warehouse", condition: "Good" }],
    ["AF-ROOM-B2", { location: "HQ floor 3", condition: "Good", bookable: true }],
  ];

  for (const [assetTag, data] of updates) {
    await prisma.asset.updateMany({ where: { assetTag, location: null }, data });
  }

  const projector = await prisma.asset.findUnique({ where: { assetTag: "AF-0062" } });
  const anyEmployee = await prisma.employee.findFirst({ where: { role: "EMPLOYEE" } });
  if (projector && anyEmployee) {
    const hasMaintenance = await prisma.maintenanceRequest.findFirst({
      where: { assetId: projector.id },
    });
    if (!hasMaintenance) {
      const now = Date.now();
      const DAY_MS = 24 * 60 * 60 * 1000;
      await prisma.maintenanceRequest.create({
        data: {
          assetId: projector.id,
          raisedById: anyEmployee.id,
          description: "Bulb replacement needed",
          status: "RESOLVED",
          decidedAt: new Date(now - 5 * DAY_MS),
          resolvedAt: new Date(now - 4 * DAY_MS),
        },
      });
    }
  }
}

async function main() {
  await seedAdmin();
  await seedDemoData();
  await backfillAssetRegistrationDemoData();
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
