import Joi from "joi";

export const bookingBodySchema = Joi.object({
  roomId: Joi.number().integer().required()
});

export const bookingParamsSchema = Joi.object({
  bookingId: Joi.string().pattern(/^-?[0-9]+$/, { name: "digits" }).required()
});
