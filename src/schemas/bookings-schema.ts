import Joi from "joi";

export const bookingBodySchema = Joi.object({
  roomId: Joi.string().pattern(/^-?[0-9]+$/, { name: "digits" }).required()
});

export const bookingParamsSchema = Joi.object({
  bookingId: Joi.string().pattern(/^-?[0-9]+$/, { name: "digits" }).required()
});
