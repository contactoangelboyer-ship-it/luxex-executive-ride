import { Router, type IRouter } from "express";
import healthRouter from "./health";
import bookingsRouter from "./bookings";
import adminRouter from "./admin/index";
import cronRouter from "./cron";
import storageRouter from "./storage";
import driverPinLoginRouter from "./driverPinLogin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(storageRouter);
router.use(bookingsRouter);
router.use("/admin", adminRouter);
router.use(cronRouter);
router.use(driverPinLoginRouter);

export default router;
