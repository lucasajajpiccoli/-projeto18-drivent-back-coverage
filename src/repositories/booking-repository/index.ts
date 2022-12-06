import { prisma } from "@/config";

async function findById(bookingId: number) {
  return prisma.booking.findUnique({
    where: {
      id: bookingId
    }
  });
}

async function findWithRoomByUserId(userId: number) {
  return prisma.booking.findFirst({
    where: {
      userId
    },
    select: {
      id: true,
      Room: true
    }
  });
}

async function createByUserIdAndRoomId(userId: number, roomId: number) {
  return prisma.booking.create({
    data: {
      userId,
      roomId
    }
  });
}

async function updateByBookingIdAndRoomId(bookingId: number, roomId: number) {
  return prisma.booking.update({
    where: {
      id: bookingId
    },
    data: {
      roomId
    }
  });
}

async function countBookingsByRoomId(roomId: number) {
  return prisma.booking.count({
    where: {
      roomId
    }
  });
}

const bookingRepository = {
  findById,
  findWithRoomByUserId,
  createByUserIdAndRoomId,
  updateByBookingIdAndRoomId,
  countBookingsByRoomId
};

export default bookingRepository;
