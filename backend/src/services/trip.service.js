import Trip from "../models/Trip.js";
import { AppError, ErrorCode } from "../core/errors.js";

/*
 * Chuyen di cua rieng tung user -- moi ham deu nhan userId va loc theo dung
 * userId do, KHONG bao gio tra ve chuyen di cua nguoi khac (khong co khai
 * niem "admin xem chuyen di user" o batch nay).
 */
export const listTrips = async (userId) => Trip.find({ userId }).sort({ startDate: -1 });

/*
 * Tao moi LUON isCurrent:false -- giong het hanh vi cua mocks/client.ts de
 * mock/that dong nhat (khong tu dong "chuyen di vua tao la chuyen di chinh").
 * Nguoi dung tu bam "dat lam chuyen di chinh" qua setCurrentTrip.
 */
export const createTrip = async (userId, data) => Trip.create({ ...data, userId, isCurrent: false });

const getOwnedTrip = async (userId, tripId) => {
  const trip = await Trip.findOne({ _id: tripId, userId });
  if (!trip) throw new AppError(ErrorCode.NOT_FOUND, "Không tìm thấy chuyến đi");
  return trip;
};

/*
 * Dam bao chi 1 isCurrent moi user (yeu cau DoD B3): bo current cu truoc,
 * roi moi dat current moi -- hai buoc tuan tu de khong bao gio thoang qua co
 * 2 ban ghi isCurrent:true (partial unique index o Trip.js la lop phong thu
 * thu hai neu race dieu kien xay ra).
 */

export const updateTrip = async (userId, tripId, data) => {
  const trip = await getOwnedTrip(userId, tripId);

  trip.countryCode = data.countryCode;
  trip.destinationCity = data.destinationCity;
  trip.destinationDetail = data.destinationDetail ?? "";
  trip.startDate = data.startDate;
  trip.endDate = data.endDate;
  trip.locationAlerts = data.locationAlerts;
  trip.regulationAlerts = data.regulationAlerts;

  await trip.save();
  return trip;
};

export const setCurrentTrip = async (userId, tripId) => {
  await getOwnedTrip(userId, tripId);
  await Trip.updateMany({ userId, isCurrent: true }, { $set: { isCurrent: false } });
  return Trip.findByIdAndUpdate(tripId, { $set: { isCurrent: true } }, { returnDocument: "after" });
};

export const deleteTrip = async (userId, tripId) => {
  const trip = await getOwnedTrip(userId, tripId);
  await trip.deleteOne();
};
