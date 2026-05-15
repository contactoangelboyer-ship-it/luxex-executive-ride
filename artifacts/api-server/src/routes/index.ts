import { Router, type IRouter } from "express";
import healthRouter from "./health";
import bookingsRouter from "./bookings";
import adminRouter from "./admin/index";

const router: IRouter = Router();

router.use(healthRouter);
router.use(bookingsRouter);
router.use("/admin", adminRouter);

export default router;
