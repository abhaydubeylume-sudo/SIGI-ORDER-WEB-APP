import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { Order, User, ActivityLog, StageName, ProductionStage, UserRole } from "./src/types";
import {
  initializeFirestoreDb,
  getOrders,
  getOrder,
  saveOrder,
  deleteOrder,
  getLogs,
  addLog
} from "./server-db";

// Standard vector illustrations for default jewelry styles and center stones
const DEFAULT_STYLE_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100" fill="none"><circle cx="50" cy="65" r="22" stroke="%2364748b" stroke-width="4"/><path d="M50 43 L40 33 L50 23 L60 33 Z" fill="%2393c5fd" stroke="%232563eb" stroke-width="2"/><circle cx="50" cy="33" r="3" fill="%23ffffff" stroke="%232563eb"/><path d="M43 43 L57 43" stroke="%232563eb" stroke-width="2"/></svg>`;

const DEFAULT_STONE_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100" fill="none"><path d="M20 35 L35 15 L65 15 L80 35 L50 85 Z" fill="%23dbeafe" stroke="%232563eb" stroke-width="2"/><path d="M35 15 L50 35 M65 15 L50 35 M20 35 L50 35 M80 35 L50 35 M35 15 L65 15 M50 35 L50 85 M20 35 L50 85 M80 35 L50 85" stroke="%233b82f6" stroke-width="1"/></svg>`;

// Default system users
const SEED_USERS: User[] = [
  { username: "admin", name: "Sarah Jenkins (Admin)", role: "Admin", password: "admin123" },
  { username: "sales", name: "Marcus Brody (Sales)", role: "Sales", password: "sales123" }
];

// Helper to calculate order-level fields dynamically
function calculateOrderMetrics(order: Order): Order {
  // Enforce stages object structure
  if (!order.stages) {
    order.stages = {
      CAD: { status: 'Not Started', startedDate: '', completedDate: '', completedQuantity: 0, updatedBy: '', remarks: '' },
      Casting: { status: 'Not Started', startedDate: '', completedDate: '', completedQuantity: 0, updatedBy: '', remarks: '' },
      Filing: { status: 'Not Started', startedDate: '', completedDate: '', completedQuantity: 0, updatedBy: '', remarks: '' },
      Selection: { status: 'Not Started', startedDate: '', completedDate: '', completedQuantity: 0, updatedBy: '', remarks: '' },
      Setting: { status: 'Not Started', startedDate: '', completedDate: '', completedQuantity: 0, updatedBy: '', remarks: '' },
      QC: { status: 'Not Started', startedDate: '', completedDate: '', completedQuantity: 0, updatedBy: '', remarks: '' },
      Packing: { status: 'Not Started', startedDate: '', completedDate: '', completedQuantity: 0, updatedBy: '', remarks: '' },
      Shipping: { status: 'Not Started', startedDate: '', completedDate: '', completedQuantity: 0, updatedBy: '', remarks: '' }
    };
  }

  // Sync completedItems list size and content with itemsCompleted if not present or size changed
  const qty = Number(order.orderQuantity) || 1;
  const compCount = Number(order.itemsCompleted) || 0;
  if (!order.completedItems || !Array.isArray(order.completedItems) || order.completedItems.length !== qty) {
    order.completedItems = Array.from({ length: qty }, (_, i) => i < compCount);
  } else {
    // If the completedItems array is present but itemsCompleted is updated through other means,
    // make sure the true count matches itemsCompleted
    const actualTrueCount = order.completedItems.filter(Boolean).length;
    if (actualTrueCount !== compCount) {
      order.completedItems = Array.from({ length: qty }, (_, i) => i < compCount);
    }
  }

  // Balance Quantity
  order.balanceQuantity = Math.max(0, qty - compCount);
  
  // Production percentage
  order.productionPercentage = order.orderQuantity > 0 
    ? Math.round((order.itemsCompleted / order.orderQuantity) * 10000) / 100 
    : 0;

  // Determine Current Production Stage
  const stagesList: StageName[] = ['CAD', 'Casting', 'Filing', 'Selection', 'Setting', 'QC', 'Packing', 'Shipping'];
  let current: StageName | 'None' = 'None';
  for (const s of stagesList) {
    if (order.stages[s] && (order.stages[s].status === 'In Progress' || order.stages[s].status === 'Completed')) {
      current = s;
    }
  }
  order.currentStage = current;

  // Calculate status
  const d = new Date();
  const yearStr = d.getFullYear();
  const monthStr = String(d.getMonth() + 1).padStart(2, '0');
  const dayStr = String(d.getDate()).padStart(2, '0');
  const todayStr = `${yearStr}-${monthStr}-${dayStr}`;
  const expectedDate = new Date(order.expectedShippingDate);
  const todayDate = new Date(todayStr);

  const diffTime = expectedDate.getTime() - todayDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (order.balanceQuantity === 0) {
    order.status = 'Completed';
  } else if (diffDays < 0) {
    order.status = 'Past Due';
  } else if (diffDays >= 0 && diffDays <= 7) {
    order.status = 'Due Soon';
  } else if (order.itemsCompleted > 0) {
    order.status = 'In Progress';
  } else {
    order.status = 'Pending';
  }

  return order;
}

async function startServer() {
  await initializeFirestoreDb();

  const app = express();
  const PORT = 3000;

  // Enable large JSON bodies for base64 file attachments
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // API 1: Healthcheck
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // API 2: Authentication Login
  app.post("/api/auth/login", (req, res) => {
    const { username, password } = req.body;
    const foundUser = SEED_USERS.find(
      u => u.username === username && u.password === password
    );
    if (foundUser) {
      const { password, ...userWithoutPassword } = foundUser;
      res.json({ success: true, user: userWithoutPassword });
    } else {
      res.status(401).json({ success: false, message: "Invalid username or password" });
    }
  });

  // API 3: Get All Orders
  app.get("/api/orders", async (req, res) => {
    try {
      const orders = await getOrders();
      const calculated = orders.map(o => calculateOrderMetrics(o));
      res.json(calculated);
    } catch (e: any) {
      res.status(500).json({ message: e.message || "Failed to fetch orders" });
    }
  });

  // API 4: Get Single Order
  app.get("/api/orders/:id", async (req, res) => {
    try {
      const order = await getOrder(req.params.id);
      if (order) {
        res.json(calculateOrderMetrics(order));
      } else {
        res.status(404).json({ message: "Order not found" });
      }
    } catch (e: any) {
      res.status(500).json({ message: e.message || "Failed to fetch order" });
    }
  });

  // API 5: Create Order
  app.post("/api/orders", async (req, res) => {
    try {
      const newOrderData = req.body;
      
      // Server-side validation
      if (!newOrderData.sigiOrderNumber || !newOrderData.orderDate || !newOrderData.expectedShippingDate) {
        return res.status(400).json({ message: "Order Number, Order Date, and Expected Shipping Date are required." });
      }

      // Check if the order number already exists in database
      const existing = await getOrder(newOrderData.sigiOrderNumber);
      if (existing) {
        return res.status(400).json({ message: `SIGI Order Number '${newOrderData.sigiOrderNumber}' already exists.` });
      }

      // Assign default stage templates if missing
      const defaultStages: Record<StageName, ProductionStage> = {
        CAD: { status: 'Not Started', startedDate: '', completedDate: '', completedQuantity: 0, updatedBy: '', remarks: '' },
        Casting: { status: 'Not Started', startedDate: '', completedDate: '', completedQuantity: 0, updatedBy: '', remarks: '' },
        Filing: { status: 'Not Started', startedDate: '', completedDate: '', completedQuantity: 0, updatedBy: '', remarks: '' },
        Selection: { status: 'Not Started', startedDate: '', completedDate: '', completedQuantity: 0, updatedBy: '', remarks: '' },
        Setting: { status: 'Not Started', startedDate: '', completedDate: '', completedQuantity: 0, updatedBy: '', remarks: '' },
        QC: { status: 'Not Started', startedDate: '', completedDate: '', completedQuantity: 0, updatedBy: '', remarks: '' },
        Packing: { status: 'Not Started', startedDate: '', completedDate: '', completedQuantity: 0, updatedBy: '', remarks: '' },
        Shipping: { status: 'Not Started', startedDate: '', completedDate: '', completedQuantity: 0, updatedBy: '', remarks: '' }
      };

      const requestedQty = Number(newOrderData.orderQuantity) || 1;
      const requestedSpecs = newOrderData.specs || [];
      const totalQty = Math.max(requestedQty, requestedSpecs.length);

      const primarySpec = requestedSpecs[0] || {};

      const order: Order = {
        sigiOrderNumber: newOrderData.sigiOrderNumber,
        orderDate: newOrderData.orderDate,
        expectedShippingDate: newOrderData.expectedShippingDate,
        clientCode: newOrderData.clientCode || "",
        clientOrderRef: newOrderData.clientOrderRef || "",
        urgent: !!newOrderData.urgent,
        sigiStyleNumber: primarySpec.sigiStyleNumber || newOrderData.sigiStyleNumber || "",
        sigiSkuNumber: primarySpec.sigiSkuNumber || newOrderData.sigiSkuNumber || "",
        metalType: primarySpec.metalType || newOrderData.metalType || "18K White Gold",
        ringSize: primarySpec.ringSize || newOrderData.ringSize || "N/A",
        centerStoneSize: primarySpec.centerStoneSize || newOrderData.centerStoneSize || "",
        centerStoneShape: primarySpec.centerStoneShape || newOrderData.centerStoneShape || "",
        centerStoneRequired: !!newOrderData.centerStoneRequired,
        stylePicture: primarySpec.stylePicture || newOrderData.stylePicture || DEFAULT_STYLE_SVG,
        stonePicture: primarySpec.stonePicture || newOrderData.stonePicture || DEFAULT_STONE_SVG,
        productionNotes: primarySpec.productionNotes || newOrderData.productionNotes || "",
        factoryNotes: newOrderData.factoryNotes || "",
        stampLaser: primarySpec.stampLaser || newOrderData.stampLaser || "",
        factoryOrderNumber: newOrderData.factoryOrderNumber || "",
        factorySerialNumber: newOrderData.factorySerialNumber || "",
        orderQuantity: totalQty,
        itemsCompleted: Number(newOrderData.itemsCompleted) || 0,
        remarks: newOrderData.remarks || "",
        stoneWeight: newOrderData.stoneWeight || "",
        adminReturnSign: newOrderData.adminReturnSign || "",
        balanceQuantity: totalQty,
        productionPercentage: 0,
        status: "Pending",
        currentStage: "None",
        stages: newOrderData.stages || JSON.parse(JSON.stringify(defaultStages)),
        attachments: newOrderData.attachments || [],
        specs: requestedSpecs,
        completedItems: Array.from({ length: totalQty }, (_, i) => i < (Number(newOrderData.itemsCompleted) || 0))
      };

      const calculated = calculateOrderMetrics(order);
      await saveOrder(calculated);

      // Activity logging
      const log: ActivityLog = {
        id: "log_" + Date.now(),
        username: newOrderData.operatorName || "system",
        userRole: newOrderData.operatorRole || "Admin",
        timestamp: new Date().toISOString(),
        action: "CREATE_ORDER",
        orderNumber: newOrderData.sigiOrderNumber,
      };
      await addLog(log);

      res.status(201).json(calculated);
    } catch (e: any) {
      res.status(500).json({ message: e.message || "Failed to create order" });
    }
  });

  // API 6: Update Order
  app.put("/api/orders/:id", async (req, res) => {
    try {
      const oldOrder = await getOrder(req.params.id);
      if (!oldOrder) {
        return res.status(404).json({ message: "Order not found" });
      }

      const updateData = req.body;

      // Detect field changes for activity logging
      const loggedFields: (keyof Order)[] = ['itemsCompleted', 'orderQuantity', 'urgent', 'expectedShippingDate', 'remarks'];
      const logsToAdd: ActivityLog[] = [];
      const timestamp = new Date().toISOString();
      const operator = updateData.operatorName || "system";
      const role = updateData.operatorRole || "Admin";

      loggedFields.forEach(field => {
        if (updateData[field] !== undefined && updateData[field] !== oldOrder[field]) {
          logsToAdd.push({
            id: "log_" + Math.random().toString(36).substr(2, 9),
            username: operator,
            userRole: role,
            timestamp,
            action: "UPDATE_ORDER",
            orderNumber: oldOrder.sigiOrderNumber,
            field: String(field),
            oldValue: String(oldOrder[field]),
            newValue: String(updateData[field])
          });
        }
      });

      // Handle updates of production stages
      if (updateData.stages) {
        const stagesList: StageName[] = ['CAD', 'Casting', 'Filing', 'Selection', 'Setting', 'QC', 'Packing', 'Shipping'];
        stagesList.forEach(stage => {
          const oldStage = oldOrder.stages[stage];
          const newStage = updateData.stages[stage];
          if (newStage && (oldStage.status !== newStage.status || oldStage.completedQuantity !== newStage.completedQuantity || oldStage.remarks !== newStage.remarks)) {
            logsToAdd.push({
              id: "log_" + Math.random().toString(36).substr(2, 9),
              username: operator,
              userRole: role,
              timestamp,
              action: "UPDATE_STAGE",
              orderNumber: oldOrder.sigiOrderNumber,
              field: `Stage: ${stage}`,
              oldValue: `${oldStage.status} (Qty: ${oldStage.completedQuantity})`,
              newValue: `${newStage.status} (Qty: ${newStage.completedQuantity})`
            });
          }
        });
      }

      // Convert number inputs to actual numbers to safeguard metric calculations
      if (updateData.itemsCompleted !== undefined) {
        updateData.itemsCompleted = Number(updateData.itemsCompleted);
      }
      if (updateData.orderQuantity !== undefined) {
        updateData.orderQuantity = Number(updateData.orderQuantity);
      }

      // Merge updates
      const merged: Order = {
        ...oldOrder,
        ...updateData,
        // Ensure complex objects are merged correctly
        stages: updateData.stages ? { ...oldOrder.stages, ...updateData.stages } : oldOrder.stages,
        attachments: updateData.attachments || oldOrder.attachments
      };

      const calculated = calculateOrderMetrics(merged);
      await saveOrder(calculated);

      // Push all new activity logs to DB
      if (logsToAdd.length > 0) {
        for (const log of logsToAdd) {
          await addLog(log);
        }
      } else if (updateData.actionLabel) {
        // General stage edit or single update with custom label
        await addLog({
          id: "log_" + Date.now(),
          username: operator,
          userRole: role,
          timestamp,
          action: "UPDATE_ORDER",
          orderNumber: oldOrder.sigiOrderNumber,
          field: "General Update",
          oldValue: updateData.actionLabel,
          newValue: "Completed"
        });
      }

      res.json(calculated);
    } catch (e: any) {
      res.status(500).json({ message: e.message || "Failed to update order" });
    }
  });

  // API 7: Delete Order
  app.delete("/api/orders/:id", async (req, res) => {
    try {
      const existing = await getOrder(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Order not found" });
      }

      const { operatorName, operatorRole } = req.query;

      await deleteOrder(req.params.id);

      // Logging deletion
      await addLog({
        id: "log_" + Date.now(),
        username: (operatorName as string) || "system",
        userRole: (operatorRole as UserRole) || "Admin",
        timestamp: new Date().toISOString(),
        action: "DELETE_ORDER",
        orderNumber: req.params.id,
      });

      res.json({ success: true, message: "Order deleted successfully." });
    } catch (e: any) {
      res.status(500).json({ message: e.message || "Failed to delete order" });
    }
  });

  // API 8: Get Activity Logs
  app.get("/api/logs", async (req, res) => {
    try {
      const logs = await getLogs();
      res.json(logs);
    } catch (e: any) {
      res.status(500).json({ message: e.message || "Failed to fetch logs" });
    }
  });

  // API 9: Add Order Attachment
  app.post("/api/orders/:id/attachments", async (req, res) => {
    try {
      const order = await getOrder(req.params.id);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      const { name, type, fileName, fileData, operatorName, operatorRole } = req.body;
      if (!fileData) {
        return res.status(400).json({ message: "File data is required" });
      }

      const attachment = {
        id: "attach_" + Date.now(),
        name: name || type,
        type: type || "Other",
        fileName: fileName || "upload.png",
        fileData,
        uploadedAt: new Date().toISOString(),
        uploadedBy: operatorName || "system"
      };

      // Update style picture or stone picture directly if specified as a primary field
      if (type === 'Style Picture') {
        order.stylePicture = fileData;
      } else if (type === 'Stone Picture') {
        order.stonePicture = fileData;
      }

      order.attachments = order.attachments || [];
      order.attachments.push(attachment);

      // Dynamic log
      const log: ActivityLog = {
        id: "log_" + Date.now(),
        username: operatorName || "system",
        userRole: operatorRole || "Admin",
        timestamp: new Date().toISOString(),
        action: "ADD_ATTACHMENT",
        orderNumber: req.params.id,
        field: `Attachment: ${attachment.name}`,
        newValue: attachment.fileName
      };

      await saveOrder(order);
      await addLog(log);

      res.json(order);
    } catch (e: any) {
      res.status(500).json({ message: e.message || "Failed to add attachment" });
    }
  });

  // API 10: Delete Order Attachment
  app.delete("/api/orders/:id/attachments/:attachmentId", async (req, res) => {
    try {
      const order = await getOrder(req.params.id);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      const { operatorName, operatorRole } = req.query;
      const attachIndex = order.attachments.findIndex(a => a.id === req.params.attachmentId);

      if (attachIndex === -1) {
        return res.status(404).json({ message: "Attachment not found" });
      }

      const removed = order.attachments[attachIndex];
      order.attachments.splice(attachIndex, 1);

      // Logging deletion
      const log: ActivityLog = {
        id: "log_" + Date.now(),
        username: (operatorName as string) || "system",
        userRole: (operatorRole as UserRole) || "Admin",
        timestamp: new Date().toISOString(),
        action: "DELETE_ATTACHMENT",
        orderNumber: req.params.id,
        field: `Attachment: ${removed.name}`,
        oldValue: removed.fileName
      };

      await saveOrder(order);
      await addLog(log);

      res.json(order);
    } catch (e: any) {
      res.status(500).json({ message: e.message || "Failed to delete attachment" });
    }
  });

  // Vite development middleware or static production handler
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`SIGI ERP Fullstack Server listening on http://localhost:${PORT}`);
  });
}

startServer();
