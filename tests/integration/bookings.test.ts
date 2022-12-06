import app, { init } from "@/app";
import { prisma } from "@/config";
import faker from "@faker-js/faker";
import { TicketStatus } from "@prisma/client";
import httpStatus from "http-status";
import * as jwt from "jsonwebtoken";
import supertest from "supertest";
import {
  createEnrollmentWithAddress,
  createUser,
  createTicket,
  createTicketTypeWithHotel,
  createTicketTypeRemote,
  createHotel,
  createRoomWithHotelId
} from "../factories";
import { createBooking } from "../factories/bookings-factory";
import { createRoom } from "../factories/rooms-factory";
import { cleanDb, generateValidToken } from "../helpers";

beforeAll(async () => {
  await init();
});

beforeEach(async () => {
  await cleanDb();
});

const server = supertest(app);

describe("GET /booking", () => {
  it("should respond with status 401 if no token is given", async () => {
    const response = await server.get("/booking");

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it("should respond with status 401 if given token is not valid", async () => {
    const token = faker.lorem.word();

    const response = await server.get("/booking").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it("should respond with status 401 if there is no session for given token", async () => {
    const userWithoutSession = await createUser();
    const token = jwt.sign({ userId: userWithoutSession.id }, process.env.JWT_SECRET);

    const response = await server.get("/booking").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  describe("when token is valid", () => {
    it("should respond with status 403 when user has no enrollment", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);

      const response = await server.get("/booking").set("Authorization", `Bearer ${token}`);

      expect(response.status).toEqual(httpStatus.FORBIDDEN);
    });

    it("should respond with status 403 when user has no ticket", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      await createEnrollmentWithAddress(user);

      const response = await server.get("/booking").set("Authorization", `Bearer ${token}`);

      expect(response.status).toEqual(httpStatus.FORBIDDEN);
    });

    it("should respond with status 403 when user has no hostable ticket", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeRemote();
      await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);

      const response = await server.get("/booking").set("Authorization", `Bearer ${token}`);

      expect(response.status).toEqual(httpStatus.FORBIDDEN);
    });

    it("should respond with status 403 when user has no paid ticket", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      await createTicket(enrollment.id, ticketType.id, TicketStatus.RESERVED);

      const response = await server.get("/booking").set("Authorization", `Bearer ${token}`);

      expect(response.status).toEqual(httpStatus.FORBIDDEN);
    });

    it("should respond with status 404 when user has no booking", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      const hotel = await createHotel();
      await createRoomWithHotelId(hotel.id);

      const response = await server.get("/booking").set("Authorization", `Bearer ${token}`);

      expect(response.status).toEqual(httpStatus.NOT_FOUND);
    });

    it("should respond with status 200 when user has a booking", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      const hotel = await createHotel();
      const room = await createRoomWithHotelId(hotel.id);
      const booking = await createBooking(user.id, room.id);

      const expectedBooking = await prisma.booking.findFirst({
        select: {
          id: true,
          Room: true
        }
      });

      const response = await server.get("/booking").set("Authorization", `Bearer ${token}`);

      expect(response.status).toEqual(httpStatus.OK);
      expect(response.body).toEqual({
        id: booking.id,
        Room: {
          ...room,
          createdAt: room.createdAt.toISOString(),
          updatedAt: room.updatedAt.toISOString()
        }
      });
    });
  });
});

describe("POST /booking", () => {
  it("should respond with status 401 if no token is given", async () => {
    const response = await server.post("/booking");

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it("should respond with status 401 if given token is not valid", async () => {
    const token = faker.lorem.word();

    const response = await server.post("/booking").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it("should respond with status 401 if there is no session for given token", async () => {
    const userWithoutSession = await createUser();
    const token = jwt.sign({ userId: userWithoutSession.id }, process.env.JWT_SECRET);

    const response = await server.post("/booking").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  describe("when token is valid", () => {
    it("should respond with status 403 when user has no enrollment", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);

      const response = await server.post("/booking")
        .send({ roomId: faker.datatype.number({ min: 1 }) })
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toEqual(httpStatus.FORBIDDEN);
    });

    it("should respond with status 403 when user has no ticket", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      await createEnrollmentWithAddress(user);

      const response = await server.post("/booking")
        .send({ roomId: faker.datatype.number({ min: 1 }) })
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toEqual(httpStatus.FORBIDDEN);
    });

    it("should respond with status 403 when user has no hostable ticket", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeRemote();
      await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);

      const response = await server.post("/booking")
        .send({ roomId: faker.datatype.number({ min: 1 }) })
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toEqual(httpStatus.FORBIDDEN);
    });

    it("should respond with status 403 when user has no paid ticket", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      await createTicket(enrollment.id, ticketType.id, TicketStatus.RESERVED);

      const response = await server.post("/booking")
        .send({ roomId: faker.datatype.number({ min: 1 }) })
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toEqual(httpStatus.FORBIDDEN);
    });

    it("should respond with status 400 when body contains invalid content", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      const hotel = await createHotel();
      await createRoomWithHotelId(hotel.id);

      const response = await server.post("/booking")
        .send({ roomId: faker.lorem.word() })
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toEqual(httpStatus.BAD_REQUEST);
    });

    it("should respond with status 403 when user already has a booking", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      const hotel = await createHotel();
      const room = await createRoomWithHotelId(hotel.id);
      await createBooking(user.id, room.id);

      const response = await server.post("/booking")
        .send({ roomId: room.id })
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toEqual(httpStatus.FORBIDDEN);
    });

    it("should respond with status 403 when roomId is full - invalid partition - max limit + 1", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      const hotel = await createHotel();
      const room = await createRoom(hotel.id);
      const userToFillBooking = await createUser();
      for(let i = 0; i < room.capacity; i++) {
        await createBooking(userToFillBooking.id, room.id);
      }

      const response = await server.post("/booking")
        .send({ roomId: room.id })
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toEqual(httpStatus.FORBIDDEN);
    });

    it("should respond with status 403 when body contains invalid content - invalid partition", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      const hotel = await createHotel();
      await createRoomWithHotelId(hotel.id);

      const response = await server.post("/booking")
        .send({ roomId: 0 })
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toEqual(httpStatus.FORBIDDEN);
    });

    it("should respond with status 404 when roomId corresponds to no room", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      const hotel = await createHotel();
      const room = await createRoomWithHotelId(hotel.id);

      const response = await server.post("/booking")
        .send({ roomId: room.id + 1 })
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toEqual(httpStatus.NOT_FOUND);
    });

    it("should respond with status 200 when user may book - valid partition - nominal value", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      const hotel = await createHotel();
      const room = await createRoom(hotel.id);
      const userToFillBooking = await createUser();

      const nominalValue = faker.datatype.number({ min: 2, max: room.capacity - 3 });
      for(let i = 0; i < nominalValue; i ++) {
        await createBooking(userToFillBooking.id, room.id);
      }

      const response = await server.post("/booking")
        .send({ roomId: room.id })
        .set("Authorization", `Bearer ${token}`);

      const resultedBooking = await prisma.booking.findFirst({
        where: {
          userId: user.id
        }
      });

      expect(response.status).toEqual(httpStatus.OK);
      expect(response.body).toEqual({ bookingId: resultedBooking.id });
      expect(resultedBooking.userId).toBe(user.id);
      expect(resultedBooking.roomId).toBe(room.id);
    });

    it("should respond with status 200 when user may book - valid partition - min limit", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      const hotel = await createHotel();
      const room = await createRoomWithHotelId(hotel.id);
      
      const response = await server.post("/booking")
        .send({ roomId: room.id })
        .set("Authorization", `Bearer ${token}`);

      const resultedBooking = await prisma.booking.findFirst({});

      expect(response.status).toEqual(httpStatus.OK);
      expect(response.body).toEqual({ bookingId: resultedBooking.id });
      expect(resultedBooking.userId).toBe(user.id);
      expect(resultedBooking.roomId).toBe(room.id);
    });

    it("should respond with status 200 when user may book - valid partition - min limit + 1", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      const hotel = await createHotel();
      const room = await createRoomWithHotelId(hotel.id);
      const userToFillBooking = await createUser();
      await createBooking(userToFillBooking.id, room.id);

      const response = await server.post("/booking")
        .send({ roomId: room.id })
        .set("Authorization", `Bearer ${token}`);

      const resultedBooking = await prisma.booking.findFirst({
        where: {
          userId: user.id
        }
      });

      expect(response.status).toEqual(httpStatus.OK);
      expect(response.body).toEqual({ bookingId: resultedBooking.id });
      expect(resultedBooking.userId).toBe(user.id);
      expect(resultedBooking.roomId).toBe(room.id);
    });

    it("should respond with status 200 when user may book - valid partition - max limit", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      const hotel = await createHotel();
      const room = await createRoomWithHotelId(hotel.id);
      const userToFillBooking = await createUser();

      const maxLimit = room.capacity - 1;
      for(let i = 0; i < maxLimit; i ++) {
        await createBooking(userToFillBooking.id, room.id);
      }
      
      const response = await server.post("/booking")
        .send({ roomId: room.id })
        .set("Authorization", `Bearer ${token}`);

      const resultedBooking = await prisma.booking.findFirst({
        where: {
          userId: user.id
        }
      });

      expect(response.status).toEqual(httpStatus.OK);
      expect(response.body).toEqual({ bookingId: resultedBooking.id });
      expect(resultedBooking.userId).toBe(user.id);
      expect(resultedBooking.roomId).toBe(room.id);
    });

    it("should respond with status 200 when user may book - valid partition - max limit - 1", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      const hotel = await createHotel();
      const room = await createRoomWithHotelId(hotel.id);
      const userToFillBooking = await createUser();

      const maxLimit = room.capacity - 1;
      for(let i = 0; i < maxLimit - 1; i ++) {
        await createBooking(userToFillBooking.id, room.id);
      }
      
      const response = await server.post("/booking")
        .send({ roomId: room.id })
        .set("Authorization", `Bearer ${token}`);

      const resultedBooking = await prisma.booking.findFirst({
        where: {
          userId: user.id
        }
      });

      expect(response.status).toEqual(httpStatus.OK);
      expect(response.body).toEqual({ bookingId: resultedBooking.id });
      expect(resultedBooking.userId).toBe(user.id);
      expect(resultedBooking.roomId).toBe(room.id);
    });
  });
});

describe("PUT /booking/:bookingId", () => {
  it("should respond with status 401 if no token is given", async () => {
    const response = await server.put(`/booking/${ faker.datatype.number({ min: 1 }) }`);

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it("should respond with status 401 if given token is not valid", async () => {
    const token = faker.lorem.word();

    const response = await server.put(`/booking/${ faker.datatype.number({ min: 1 }) }`).set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it("should respond with status 401 if there is no session for given token", async () => {
    const userWithoutSession = await createUser();
    const token = jwt.sign({ userId: userWithoutSession.id }, process.env.JWT_SECRET);

    const response = await server.put(`/booking/${ faker.datatype.number({ min: 1 }) }`).set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  describe("when token is valid", () => {
    it("should respond with status 403 when user has no enrollment", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);

      const response = await server
        .put(`/booking/${ faker.datatype.number({ min: 1 }) }`)
        .send({ roomId: faker.datatype.number({ min: 1 }) })
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toEqual(httpStatus.FORBIDDEN);
    });

    it("should respond with status 403 when user has no ticket", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      await createEnrollmentWithAddress(user);

      const response = await server
        .put(`/booking/${ faker.datatype.number({ min: 1 }) }`)
        .send({ roomId: faker.datatype.number({ min: 1 }) })
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toEqual(httpStatus.FORBIDDEN);
    });

    it("should respond with status 403 when user has no hostable ticket", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeRemote();
      await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);

      const response = await server
        .put(`/booking/${ faker.datatype.number({ min: 1 }) }`)
        .send({ roomId: faker.datatype.number({ min: 1 }) })
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toEqual(httpStatus.FORBIDDEN);
    });

    it("should respond with status 403 when user has no paid ticket", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      await createTicket(enrollment.id, ticketType.id, TicketStatus.RESERVED);

      const response = await server
        .put(`/booking/${ faker.datatype.number({ min: 1 }) }`)
        .send({ roomId: faker.datatype.number({ min: 1 }) })
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toEqual(httpStatus.FORBIDDEN);
    });

    it("should respond with status 400 when route parameter is invalid", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);

      const response = await server
        .put(`/booking/${ faker.lorem.word() }`)
        .send({ roomId: faker.datatype.number({ min: 1 }) })
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toEqual(httpStatus.BAD_REQUEST);
    });

    it("should respond with status 400 when route parameter is invalid", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);

      const response = await server
        .put(`/booking/${ faker.datatype.number({ min: 1 }) }`)
        .send({ roomId: faker.lorem.word() })
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toEqual(httpStatus.BAD_REQUEST);
    });

    it("should respond with status 403 when user has no booking", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      const hotel = await createHotel();
      const room = await createRoomWithHotelId(hotel.id);
      const otherUser = await createUser();
      const otherRoom = await createRoomWithHotelId(hotel.id);
      const booking = await createBooking(otherUser.id, otherRoom.id);

      const response = await server
        .put(`/booking/${booking.id}`)
        .send({ roomId: room.id })
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toEqual(httpStatus.FORBIDDEN);
    });

    it("should respond with status 403 when roomId is the same constant in booking", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      const hotel = await createHotel();
      const room = await createRoomWithHotelId(hotel.id);
      const booking = await createBooking(user.id, room.id);

      const response = await server
        .put(`/booking/${booking.id}`)
        .send({ roomId: room.id })
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toEqual(httpStatus.FORBIDDEN);
    });

    it("should respond with status 403 when chosen room is full - invalid partition - max lim + 1", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      const hotel = await createHotel();
      const originalRoom = await createRoom(hotel.id);
      const chosenRoom = await createRoom(hotel.id);
      const booking = await createBooking(user.id, originalRoom.id);
      const otherUser = await createUser();

      const maxLimit = chosenRoom.capacity - 1;
      for(let i = 0; i < maxLimit + 1; i ++) {
        await createBooking(otherUser.id, chosenRoom.id);
      }

      const response = await server
        .put(`/booking/${booking.id}`)
        .send({ roomId: chosenRoom.id })
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toEqual(httpStatus.FORBIDDEN);
    });

    it("should respond with status 403 when roomId is invalid - invalid partition", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      const hotel = await createHotel();
      const originalRoom = await createRoom(hotel.id);
      const booking = await createBooking(user.id, originalRoom.id);

      const response = await server
        .put(`/booking/${booking.id}`)
        .send({ roomId: 0 })
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toEqual(httpStatus.FORBIDDEN);
    });

    it("should respond with status 403 when bookingId is invalid - invalid partition", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      const hotel = await createHotel();
      const originalRoom = await createRoom(hotel.id);
      const chosenRoom = await createRoom(hotel.id);

      const response = await server
        .put(`/booking/${0}`)
        .send({ roomId: chosenRoom.id })
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toEqual(httpStatus.FORBIDDEN);
    });

    it("should respond with status 404 when roomId corresponds to no room", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      const hotel = await createHotel();
      const originalRoom = await createRoom(hotel.id);
      const chosenRoom = await createRoom(hotel.id);
      const booking = await createBooking(user.id, originalRoom.id);

      const response = await server
        .put(`/booking/${booking.id}`)
        .send({ roomId: chosenRoom.id + 1 })
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toEqual(httpStatus.NOT_FOUND);
    });

    it("should respond with status 404 when bookingId corresponds to no booking", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      const hotel = await createHotel();
      const originalRoom = await createRoom(hotel.id);
      const chosenRoom = await createRoom(hotel.id);
      const booking = await createBooking(user.id, originalRoom.id);

      const response = await server
        .put(`/booking/${booking.id + 1}`)
        .send({ roomId: chosenRoom.id })
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toEqual(httpStatus.NOT_FOUND);
    });

    it("should respond with status 200 when user may edit booking - valid partition - nominal value", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      const hotel = await createHotel();
      const originalRoom = await createRoom(hotel.id);
      const chosenRoom = await createRoom(hotel.id);
      const booking = await createBooking(user.id, originalRoom.id);
      const otherUser = await createUser();

      const nominalValue = faker.datatype.number({ min: 2, max: chosenRoom.capacity - 3 });
      for(let i = 0; i < nominalValue; i ++) {
        await createBooking(otherUser.id, chosenRoom.id);
      }

      const response = await server
        .put(`/booking/${booking.id}`)
        .send({ roomId: chosenRoom.id })
        .set("Authorization", `Bearer ${token}`);

      const resultedBooking = await prisma.booking.findUnique({
        where: {
          id: booking.id
        }
      });

      expect(response.status).toEqual(httpStatus.OK);
      expect(response.body).toEqual({ bookingId: booking.id });
      expect(resultedBooking.userId).toBe(user.id);
      expect(resultedBooking.roomId).toBe(chosenRoom.id);
    });

    it("should respond with status 200 when user may edit booking - valid partition - min limit", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      const hotel = await createHotel();
      const originalRoom = await createRoom(hotel.id);
      const chosenRoom = await createRoom(hotel.id);
      const booking = await createBooking(user.id, originalRoom.id);

      const response = await server
        .put(`/booking/${booking.id}`)
        .send({ roomId: chosenRoom.id })
        .set("Authorization", `Bearer ${token}`);

      const resultedBooking = await prisma.booking.findUnique({
        where: {
          id: booking.id
        }
      });

      expect(response.status).toEqual(httpStatus.OK);
      expect(response.body).toEqual({ bookingId: booking.id });
      expect(resultedBooking.userId).toBe(user.id);
      expect(resultedBooking.roomId).toBe(chosenRoom.id);
    });

    it("should respond with status 200 when user may edit booking - valid partition - min limit + 1", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      const hotel = await createHotel();
      const originalRoom = await createRoom(hotel.id);
      const chosenRoom = await createRoom(hotel.id);
      const booking = await createBooking(user.id, originalRoom.id);
      const otherUser = await createUser();
      await createBooking(otherUser.id, chosenRoom.id);

      const response = await server
        .put(`/booking/${booking.id}`)
        .send({ roomId: chosenRoom.id })
        .set("Authorization", `Bearer ${token}`);

      const resultedBooking = await prisma.booking.findUnique({
        where: {
          id: booking.id
        }
      });

      expect(response.status).toEqual(httpStatus.OK);
      expect(response.body).toEqual({ bookingId: booking.id });
      expect(resultedBooking.userId).toBe(user.id);
      expect(resultedBooking.roomId).toBe(chosenRoom.id);
    });

    it("should respond with status 200 when user may edit booking - valid partition - max limit", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      const hotel = await createHotel();
      const originalRoom = await createRoom(hotel.id);
      const chosenRoom = await createRoom(hotel.id);
      const booking = await createBooking(user.id, originalRoom.id);
      const otherUser = await createUser();

      const maxLimit = chosenRoom.capacity - 1;
      for(let i = 0; i < maxLimit; i ++) {
        await createBooking(otherUser.id, chosenRoom.id);
      }

      const response = await server
        .put(`/booking/${booking.id}`)
        .send({ roomId: chosenRoom.id })
        .set("Authorization", `Bearer ${token}`);

      const resultedBooking = await prisma.booking.findUnique({
        where: {
          id: booking.id
        }
      });

      expect(response.status).toEqual(httpStatus.OK);
      expect(response.body).toEqual({ bookingId: booking.id });
      expect(resultedBooking.userId).toBe(user.id);
      expect(resultedBooking.roomId).toBe(chosenRoom.id);
    });

    it("should respond with status 200 when user may edit booking - valid partition - max limit - 1", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      const hotel = await createHotel();
      const originalRoom = await createRoom(hotel.id);
      const chosenRoom = await createRoom(hotel.id);
      const booking = await createBooking(user.id, originalRoom.id);
      const otherUser = await createUser();

      const maxLimit = chosenRoom.capacity - 1;
      for(let i = 0; i < maxLimit - 1; i ++) {
        await createBooking(otherUser.id, chosenRoom.id);
      }

      const response = await server
        .put(`/booking/${booking.id}`)
        .send({ roomId: chosenRoom.id })
        .set("Authorization", `Bearer ${token}`);

      const resultedBooking = await prisma.booking.findUnique({
        where: {
          id: booking.id
        }
      });

      expect(response.status).toEqual(httpStatus.OK);
      expect(response.body).toEqual({ bookingId: booking.id });
      expect(resultedBooking.userId).toBe(user.id);
      expect(resultedBooking.roomId).toBe(chosenRoom.id);
    });
  });
});
