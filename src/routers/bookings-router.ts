import { Router } from "express";
import { authenticateToken } from "@/middlewares";
import { validateBody, validateParams } from "@/middlewares";
import { bookingBodySchema, bookingParamsSchema } from "@/schemas/bookings-schema";
import { getBooking, postBooking, putBooking } from "@/controllers";

const bookingsRouter = Router();

bookingsRouter
  .all("/*", authenticateToken)
  .get("", getBooking)
  .post("", validateBody(bookingBodySchema), postBooking)
  .put("/:bookingId", validateBody(bookingBodySchema), validateParams(bookingParamsSchema), putBooking);

export { bookingsRouter };
