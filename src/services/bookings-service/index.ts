import { Room, TicketStatus } from "@prisma/client";
import { forbiddenError, notFoundError } from "@/errors";
import bookingRepository from "@/repositories/booking-repository";
import enrollmentRepository from "@/repositories/enrollment-repository";
import ticketRepository from "@/repositories/ticket-repository";
import roomRepository from "@/repositories/room-repository";

async function isUserAllowed(userId: number): Promise<boolean> {
  const enrollment = await enrollmentRepository.findWithAddressByUserId(userId);
  if(!enrollment) {
    return false;
  }

  const ticket = await ticketRepository.findTicketByEnrollmentId(enrollment.id);
  if(!ticket) {
    return false;
  }

  const isHostableTicketType = !ticket.TicketType.isRemote && ticket.TicketType.includesHotel;
  const isTicketPaid = ticket.status === TicketStatus.PAID;
  if(!(isHostableTicketType && isTicketPaid)) {
    return false;
  }

  return true;
}

async function isRoomFull(room: Room): Promise<boolean> {
  const { capacity } = room;
  const bookingsOnRoom = await bookingRepository.countBookingsByRoomId(room.id);

  const isFull = bookingsOnRoom === capacity;

  return isFull;
}

async function getBooking(userId: number): Promise<BookingWithRoom> {
  const allowed = await isUserAllowed(userId);
  if(!allowed) {
    throw forbiddenError();
  }

  const bookingWithRoom = await bookingRepository.findWithRoomByUserId(userId);
  if(!bookingWithRoom) {
    throw notFoundError();
  }

  return bookingWithRoom;
}

async function createBooking(userId: number, roomId: number): Promise<BookingId> {
  if(roomId < 1) {
    throw forbiddenError();
  }
  
  const allowed = await isUserAllowed(userId);
  if(!allowed) {
    throw forbiddenError();
  }

  const bookingWithRoom = await bookingRepository.findWithRoomByUserId(userId);
  if(bookingWithRoom) {
    throw forbiddenError();
  }

  const room = await roomRepository.findRoomById(roomId);
  if(!room) {
    throw notFoundError();
  }

  const full = await isRoomFull(room);
  if(full) {
    throw forbiddenError();
  }

  const createdBooking = await bookingRepository.createByUserIdAndRoomId(userId, roomId);

  return { bookingId: createdBooking.id };
}

async function updateBooking(userId: number, bookingId: number, roomId: number): Promise<BookingId> {
  if(roomId < 1 || bookingId < 1) {
    throw forbiddenError();
  }
  
  const allowed = await isUserAllowed(userId);
  if(!allowed) {
    throw forbiddenError();
  }

  const room = await roomRepository.findRoomById(roomId);
  const booking = await bookingRepository.findById(bookingId);
  if(!(room && booking)) {
    throw notFoundError();
  }

  const userBooking = await bookingRepository.findWithRoomByUserId(userId);
  const isBookingIdFromUser = userBooking && userBooking?.id === bookingId;
  if(!isBookingIdFromUser) {
    throw forbiddenError();
  }

  const isRoomTheSame = booking.roomId === roomId;
  if(isRoomTheSame) {
    throw forbiddenError();
  }

  const full = await isRoomFull(room);
  if(full) {
    throw forbiddenError();
  }

  const updatedBooking = await bookingRepository.updateByBookingIdAndRoomId(bookingId, roomId);

  return { bookingId };
}

type BookingWithRoom = {
  id: number,
  Room: Room
};

type BookingId = { bookingId: number };

const bookingsService = {
  getBooking,
  createBooking,
  updateBooking
};

export default bookingsService;
