import fs from "fs";
import path from "path";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc, getDocs, deleteDoc, collection, limit, query } from "firebase/firestore";
import { Order, ActivityLog, StageName, ProductionStage, User } from "./src/types";

// Standard vector illustrations for default jewelry styles and center stones
const DEFAULT_STYLE_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100" fill="none"><circle cx="50" cy="65" r="22" stroke="%2364748b" stroke-width="4"/><path d="M50 43 L40 33 L50 23 L60 33 Z" fill="%2393c5fd" stroke="%232563eb" stroke-width="2"/><circle cx="50" cy="33" r="3" fill="%23ffffff" stroke="%232563eb"/><path d="M43 43 L57 43" stroke="%232563eb" stroke-width="2"/></svg>`;
const DEFAULT_STONE_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100" fill="none"><path d="M20 35 L35 15 L65 15 L80 35 L50 85 Z" fill="%23dbeafe" stroke="%232563eb" stroke-width="2"/><path d="M35 15 L50 35 M65 15 L50 35 M20 35 L50 35 M80 35 L50 35 M35 15 L65 15 M50 35 L50 85 M20 35 L50 85 M80 35 L50 85" stroke="%233b82f6" stroke-width="1"/></svg>`;

import { fileURLToPath } from "url";

let currentDir = process.cwd();
try {
  if (typeof __dirname !== "undefined") {
    currentDir = __dirname;
  } else if (typeof import.meta !== "undefined" && import.meta.url) {
    currentDir = path.dirname(fileURLToPath(import.meta.url));
  }
} catch (e) {
  // Safe fallback
}

const DB_FILE = path.join(process.cwd(), "data", "db.json");

// Read Firebase Config
let config: any = {};
try {
  // Check relative to currentDir first, then fallback
  const preferredConfigPath = path.join(currentDir, "firebase-applet-config.json");
  const fallbackConfigPath = "./firebase-applet-config.json";
  const finalConfigPath = fs.existsSync(preferredConfigPath)
    ? preferredConfigPath
    : (fs.existsSync(fallbackConfigPath) ? fallbackConfigPath : path.join(process.cwd(), "firebase-applet-config.json"));

  console.log("Loading firebase config from path:", finalConfigPath);
  config = JSON.parse(fs.readFileSync(finalConfigPath, "utf-8"));
} catch (e) {
  console.error("Failed to read firebase-applet-config.json:", e);
}

const firebaseConfig = {
  apiKey: config.apiKey,
  authDomain: config.authDomain,
  projectId: config.projectId,
  storageBucket: config.storageBucket,
  messagingSenderId: config.messagingSenderId,
  appId: config.appId
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app, config.firestoreDatabaseId);

// Helper to create stages for seed orders
function createStages(completedStages: StageName[], currentInProgress?: StageName, operatorName = "Marcus Brody"): Record<StageName, ProductionStage> {
  const stages: StageName[] = ['CAD', 'Casting', 'Filing', 'Selection', 'Setting', 'QC', 'Packing', 'Shipping'];
  const result: Partial<Record<StageName, ProductionStage>> = {};
  
  stages.forEach(stage => {
    if (completedStages.includes(stage)) {
      result[stage] = {
        status: 'Completed',
        startedDate: '2026-06-15',
        completedDate: '2026-06-18',
        completedQuantity: 1,
        updatedBy: operatorName,
        remarks: `${stage} completed with strict dimensional tolerance.`
      };
    } else if (stage === currentInProgress) {
      result[stage] = {
        status: 'In Progress',
        startedDate: '2026-07-02',
        completedDate: '',
        completedQuantity: 0,
        updatedBy: operatorName,
        remarks: `Currently in progress. Monitoring parameters closely.`
      };
    } else {
      result[stage] = {
        status: 'Not Started',
        startedDate: '',
        completedDate: '',
        completedQuantity: 0,
        updatedBy: '',
        remarks: ''
      };
    }
  });

  return result as Record<StageName, ProductionStage>;
}

const SEED_ORDERS: Order[] = [
  {
    sigiOrderNumber: "SIGI-2026-001",
    orderDate: "2026-06-10",
    expectedShippingDate: "2026-07-05",
    clientCode: "MYS-01",
    clientOrderRef: "PO-99120",
    urgent: false,
    sigiStyleNumber: "RG-1082",
    sigiSkuNumber: "RG-1082-Y18",
    metalType: "18K Yellow Gold",
    ringSize: "6.5",
    centerStoneSize: "1.50 ct",
    centerStoneShape: "Round Brilliant",
    centerStoneRequired: true,
    stylePicture: DEFAULT_STYLE_SVG,
    stonePicture: DEFAULT_STONE_SVG,
    factoryNotes: "Laser stamp inside shank: 'FOREVER M&A'. High polish finish.",
    stampLaser: "18K & SIGI",
    factoryOrderNumber: "FAC-9081",
    factorySerialNumber: "SN-77610",
    orderQuantity: 5,
    itemsCompleted: 5,
    balanceQuantity: 0,
    productionPercentage: 100,
    status: "Completed",
    currentStage: "Shipping",
    remarks: "Delivered on schedule. Perfect finish.",
    stages: createStages(['CAD', 'Casting', 'Filing', 'Selection', 'Setting', 'QC', 'Packing', 'Shipping']),
    attachments: []
  },
  {
    sigiOrderNumber: "SIGI-2026-002",
    orderDate: "2026-06-25",
    expectedShippingDate: "2026-07-15",
    clientCode: "GLD-22",
    clientOrderRef: "PO-88122",
    urgent: true,
    sigiStyleNumber: "ER-2394",
    sigiSkuNumber: "ER-2394-W14",
    metalType: "14K White Gold",
    ringSize: "N/A",
    centerStoneSize: "0.80 ct each",
    centerStoneShape: "Oval Cut",
    centerStoneRequired: true,
    stylePicture: DEFAULT_STYLE_SVG,
    stonePicture: DEFAULT_STONE_SVG,
    factoryNotes: "Prongs must be extra secure. Double check matching color on both center stones.",
    stampLaser: "14K GBL",
    factoryOrderNumber: "FAC-9082",
    factorySerialNumber: "SN-77611",
    orderQuantity: 8,
    itemsCompleted: 0,
    balanceQuantity: 8,
    productionPercentage: 0,
    status: "On Track",
    currentStage: "Selection",
    remarks: "Stones selected and approved. Moving to Setting stage tomorrow.",
    stages: createStages(['CAD', 'Casting', 'Filing'], 'Selection'),
    attachments: []
  },
  {
    sigiOrderNumber: "SIGI-2026-003",
    orderDate: "2026-07-01",
    expectedShippingDate: "2026-07-08",
    clientCode: "LUX-08",
    clientOrderRef: "REF-4412",
    urgent: true,
    sigiStyleNumber: "PD-9831",
    sigiSkuNumber: "PD-9831-PT",
    metalType: "Platinum 950",
    ringSize: "N/A",
    centerStoneSize: "2.50 ct",
    centerStoneShape: "Emerald Cut",
    centerStoneRequired: true,
    stylePicture: DEFAULT_STYLE_SVG,
    stonePicture: DEFAULT_STONE_SVG,
    factoryNotes: "Urgent wedding pendant. Mirror finish required.",
    stampLaser: "PLAT950",
    factoryOrderNumber: "FAC-9083",
    factorySerialNumber: "SN-77612",
    orderQuantity: 2,
    itemsCompleted: 0,
    balanceQuantity: 2,
    productionPercentage: 0,
    status: "Due Soon",
    currentStage: "QC",
    remarks: "Pendant is fully set. QC inspector Elena Rostova is checking prongs right now.",
    stages: createStages(['CAD', 'Casting', 'Filing', 'Selection', 'Setting'], 'QC'),
    attachments: []
  },
  {
    sigiOrderNumber: "SIGI-2026-004",
    orderDate: "2026-06-01",
    expectedShippingDate: "2026-06-30",
    clientCode: "SLV-15",
    clientOrderRef: "SILVER-PO-1",
    urgent: false,
    sigiStyleNumber: "RG-5522",
    sigiSkuNumber: "RG-5522-SS",
    metalType: "Sterling Silver",
    ringSize: "8.0",
    centerStoneSize: "0.50 ct",
    centerStoneShape: "Cushion Cut",
    centerStoneRequired: false,
    stylePicture: DEFAULT_STYLE_SVG,
    stonePicture: DEFAULT_STONE_SVG,
    factoryNotes: "Client supplying center stone. Only build mounting.",
    stampLaser: "925",
    factoryOrderNumber: "FAC-9084",
    factorySerialNumber: "SN-77613",
    orderQuantity: 12,
    itemsCompleted: 4,
    balanceQuantity: 8,
    productionPercentage: 33.33,
    status: "Past Due",
    currentStage: "Setting",
    remarks: "Delayed waiting for client to supply center stones. Received stones yesterday.",
    stages: createStages(['CAD', 'Casting', 'Filing', 'Selection'], 'Setting'),
    attachments: []
  },
  {
    sigiOrderNumber: "SIGI-2026-005",
    orderDate: "2026-07-04",
    expectedShippingDate: "2026-07-24",
    clientCode: "MYS-01",
    clientOrderRef: "PO-99125",
    urgent: false,
    sigiStyleNumber: "RG-2022",
    sigiSkuNumber: "RG-2022-R18",
    metalType: "18K Rose Gold",
    ringSize: "7.0",
    centerStoneSize: "1.00 ct",
    centerStoneShape: "Princess Cut",
    centerStoneRequired: true,
    stylePicture: DEFAULT_STYLE_SVG,
    stonePicture: DEFAULT_STONE_SVG,
    factoryNotes: "Satin finish band, polished setting basket.",
    stampLaser: "18K Rose",
    factoryOrderNumber: "FAC-9085",
    factorySerialNumber: "SN-77614",
    orderQuantity: 4,
    itemsCompleted: 0,
    balanceQuantity: 4,
    productionPercentage: 0,
    status: "On Track",
    currentStage: "CAD",
    remarks: "CAD design in drafting. Ready for client review.",
    stages: createStages([], 'CAD'),
    attachments: []
  }
];

let useLocalFallback = false;

const DB_DIR = path.dirname(DB_FILE);
try {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
} catch (e) {
  console.warn("Could not create local DB directory (might be on read-only serverless environment):", e);
}

function readLocalDb(): { orders: Order[]; logs: ActivityLog[]; users: User[] } {
  try {
    if (!fs.existsSync(DB_FILE)) {
      const data = {
        orders: SEED_ORDERS,
        logs: [
          {
            id: "log_1",
            username: "admin",
            userRole: "Admin" as const,
            timestamp: "2026-07-01T09:00:00Z",
            action: "SYSTEM_INIT",
            orderNumber: "ALL",
            newValue: "Database seeded with 5 initial orders and configuration."
          }
        ],
        users: [
          { username: "admin", name: "Sarah Jenkins (Admin)", role: "Admin" as const, password: "adminsigi" },
          { username: "sales", name: "Marcus Brody (Sales)", role: "Sales" as const, password: "sales123" }
        ]
      };
      try {
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
      } catch (writeErr) {
        console.warn("Could not write initial local DB file (read-only filesystem):", writeErr);
      }
      return data;
    }
    const fileContent = fs.readFileSync(DB_FILE, "utf-8");
    const parsed = JSON.parse(fileContent);
    if (!parsed.users) {
      parsed.users = [
        { username: "admin", name: "Sarah Jenkins (Admin)", role: "Admin", password: "adminsigi" },
        { username: "sales", name: "Marcus Brody (Sales)", role: "Sales", password: "sales123" }
      ];
    }
    return parsed;
  } catch (err) {
    console.warn("Failed to read local DB file, fallback to in-memory seed:", err);
    return {
      orders: SEED_ORDERS,
      logs: [],
      users: [
        { username: "admin", name: "Sarah Jenkins (Admin)", role: "Admin", password: "adminsigi" },
        { username: "sales", name: "Marcus Brody (Sales)", role: "Sales", password: "sales123" }
      ]
    };
  }
}

function writeLocalDb(data: { orders: Order[]; logs: ActivityLog[]; users: User[] }) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.warn("Failed to write local DB file (read-only filesystem):", err);
  }
}

export async function initializeFirestoreDb() {
  console.log("Checking and initializing Firestore database...");
  try {
    // Check and seed users first
    const usersQ = query(collection(db, "users"), limit(1));
    const usersSnapshot = await getDocs(usersQ);
    if (usersSnapshot.empty) {
      console.log("Firestore database 'users' is empty. Seeding users...");
      const usersToSeed = [
        { username: "admin", name: "Sarah Jenkins (Admin)", role: "Admin", password: "adminsigi" },
        { username: "sales", name: "Marcus Brody (Sales)", role: "Sales", password: "sales123" }
      ];
      for (const u of usersToSeed) {
        await setDoc(doc(db, "users", u.username), u);
      }
      console.log(`Seeded ${usersToSeed.length} users in Firestore.`);
    }

    const q = query(collection(db, "orders"), limit(1));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      console.log("Firestore database 'orders' is empty. Starting seeding/migration...");
      let ordersToSeed = SEED_ORDERS;
      let logsToSeed: ActivityLog[] = [
        {
          id: "log_1",
          username: "admin",
          userRole: "Admin",
          timestamp: "2026-07-01T09:00:00Z",
          action: "SYSTEM_INIT",
          orderNumber: "ALL",
          newValue: "Database seeded with 5 initial orders and configuration."
        }
      ];

      // Try migrating from local db.json if exists
      if (fs.existsSync(DB_FILE)) {
        try {
          const fileContent = fs.readFileSync(DB_FILE, "utf-8");
          const localData = JSON.parse(fileContent);
          if (localData && Array.isArray(localData.orders) && localData.orders.length > 0) {
            console.log(`Found local db.json with ${localData.orders.length} orders. Migrating to Firestore...`);
            ordersToSeed = localData.orders;
            if (Array.isArray(localData.logs)) {
              logsToSeed = localData.logs;
            }
          }
        } catch (err) {
          console.error("Failed to parse local db.json for migration:", err);
        }
      }

      // Seed orders
      for (const order of ordersToSeed) {
        await setDoc(doc(db, "orders", order.sigiOrderNumber), order);
      }
      console.log(`Seeded ${ordersToSeed.length} orders in Firestore.`);

      // Seed logs
      for (const log of logsToSeed) {
        await setDoc(doc(db, "logs", log.id), log);
      }
      console.log(`Seeded ${logsToSeed.length} activity logs in Firestore.`);
    } else {
      console.log("Firestore database already initialized.");
    }
  } catch (e) {
    console.error("CRITICAL: Failed to initialize Firestore db. Falling back to local file database:", e);
    useLocalFallback = true;
    // Ensure directory and seeded file exist
    readLocalDb();
  }
}

export async function getOrders(): Promise<Order[]> {
  if (useLocalFallback) {
    const local = readLocalDb();
    return local.orders.sort((a, b) => b.sigiOrderNumber.localeCompare(a.sigiOrderNumber));
  }
  try {
    const snapshot = await getDocs(collection(db, "orders"));
    const orders: Order[] = [];
    snapshot.forEach((doc) => {
      orders.push(doc.data() as Order);
    });
    return orders.sort((a, b) => b.sigiOrderNumber.localeCompare(a.sigiOrderNumber));
  } catch (e) {
    console.error("Firestore getOrders failed, using local database fallback:", e);
    useLocalFallback = true;
    const local = readLocalDb();
    return local.orders.sort((a, b) => b.sigiOrderNumber.localeCompare(a.sigiOrderNumber));
  }
}

export async function getOrder(id: string): Promise<Order | null> {
  if (useLocalFallback) {
    const local = readLocalDb();
    return local.orders.find(o => o.sigiOrderNumber === id) || null;
  }
  try {
    const docSnap = await getDoc(doc(db, "orders", id));
    if (docSnap.exists()) {
      return docSnap.data() as Order;
    }
    return null;
  } catch (e) {
    console.error(`Firestore getOrder(${id}) failed, using local database fallback:`, e);
    useLocalFallback = true;
    const local = readLocalDb();
    return local.orders.find(o => o.sigiOrderNumber === id) || null;
  }
}

export async function saveOrder(order: Order): Promise<void> {
  if (useLocalFallback) {
    const local = readLocalDb();
    const index = local.orders.findIndex(o => o.sigiOrderNumber === order.sigiOrderNumber);
    if (index > -1) {
      local.orders[index] = order;
    } else {
      local.orders.unshift(order);
    }
    writeLocalDb(local);
    return;
  }
  try {
    await setDoc(doc(db, "orders", order.sigiOrderNumber), order);
  } catch (e) {
    console.error(`Firestore saveOrder failed, using local database fallback:`, e);
    useLocalFallback = true;
    const local = readLocalDb();
    const index = local.orders.findIndex(o => o.sigiOrderNumber === order.sigiOrderNumber);
    if (index > -1) {
      local.orders[index] = order;
    } else {
      local.orders.unshift(order);
    }
    writeLocalDb(local);
  }
}

export async function deleteOrder(id: string): Promise<void> {
  if (useLocalFallback) {
    const local = readLocalDb();
    local.orders = local.orders.filter(o => o.sigiOrderNumber !== id);
    writeLocalDb(local);
    return;
  }
  try {
    await deleteDoc(doc(db, "orders", id));
  } catch (e) {
    console.error(`Firestore deleteOrder(${id}) failed, using local database fallback:`, e);
    useLocalFallback = true;
    const local = readLocalDb();
    local.orders = local.orders.filter(o => o.sigiOrderNumber !== id);
    writeLocalDb(local);
  }
}

export async function getLogs(): Promise<ActivityLog[]> {
  if (useLocalFallback) {
    const local = readLocalDb();
    return local.logs.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }
  try {
    const snapshot = await getDocs(collection(db, "logs"));
    const logs: ActivityLog[] = [];
    snapshot.forEach((doc) => {
      logs.push(doc.data() as ActivityLog);
    });
    return logs.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  } catch (e) {
    console.error("Firestore getLogs failed, using local database fallback:", e);
    useLocalFallback = true;
    const local = readLocalDb();
    return local.logs.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }
}

export async function addLog(log: ActivityLog): Promise<void> {
  if (useLocalFallback) {
    const local = readLocalDb();
    local.logs.unshift(log);
    writeLocalDb(local);
    return;
  }
  try {
    await setDoc(doc(db, "logs", log.id), log);
  } catch (e) {
    console.error(`Firestore addLog failed, using local database fallback:`, e);
    useLocalFallback = true;
    const local = readLocalDb();
    local.logs.unshift(log);
    writeLocalDb(local);
  }
}

export async function getUsers(): Promise<User[]> {
  if (useLocalFallback) {
    const local = readLocalDb();
    return local.users || [];
  }
  try {
    const snapshot = await getDocs(collection(db, "users"));
    const users: User[] = [];
    snapshot.forEach((doc) => {
      users.push(doc.data() as User);
    });
    return users;
  } catch (e) {
    console.error("Firestore getUsers failed, using local database fallback:", e);
    useLocalFallback = true;
    const local = readLocalDb();
    return local.users || [];
  }
}

export async function getUser(username: string): Promise<User | null> {
  if (useLocalFallback) {
    const local = readLocalDb();
    return local.users.find(u => u.username.toLowerCase() === username.toLowerCase()) || null;
  }
  try {
    const docSnap = await getDoc(doc(db, "users", username.toLowerCase()));
    if (docSnap.exists()) {
      return docSnap.data() as User;
    }
    // Fallback search in case case-sensitivity varies
    const allUsers = await getUsers();
    return allUsers.find(u => u.username.toLowerCase() === username.toLowerCase()) || null;
  } catch (e) {
    console.error(`Firestore getUser(${username}) failed, using local database fallback:`, e);
    useLocalFallback = true;
    const local = readLocalDb();
    return local.users.find(u => u.username.toLowerCase() === username.toLowerCase()) || null;
  }
}

export async function saveUser(user: User): Promise<void> {
  if (useLocalFallback) {
    const local = readLocalDb();
    const idx = local.users.findIndex(u => u.username.toLowerCase() === user.username.toLowerCase());
    if (idx >= 0) {
      local.users[idx] = user;
    } else {
      local.users.push(user);
    }
    writeLocalDb(local);
    return;
  }
  try {
    await setDoc(doc(db, "users", user.username.toLowerCase()), user);
  } catch (e) {
    console.error(`Firestore saveUser failed, using local database fallback:`, e);
    useLocalFallback = true;
    const local = readLocalDb();
    const idx = local.users.findIndex(u => u.username.toLowerCase() === user.username.toLowerCase());
    if (idx >= 0) {
      local.users[idx] = user;
    } else {
      local.users.push(user);
    }
    writeLocalDb(local);
  }
}

