import connectDB, { disconnectDB } from '#configs/db.config.js';
import { DELIVERY_WEEK_DAYS } from '#entities/deliveryServices/deliveryServices.constants.js';
import { DeliveryServiceModel } from '#entities/deliveryServices/deliveryServices.model.js';

const originCoordinates = [51.3377, 35.6997];
const deliveryTimeRanges = [
  { startsAt: '09:00', endsAt: '11:00' },
  { startsAt: '12:00', endsAt: '14:00' },
  { startsAt: '15:00', endsAt: '17:00' },
  { startsAt: '18:00', endsAt: '20:00' },
];
const availability = Object.fromEntries(
  DELIVERY_WEEK_DAYS.map((weekday) => [weekday, deliveryTimeRanges]),
);

const deliveryServices = [
  {
    title: 'Tipax',
    title_fa: 'تیپاکس',
    logo: 'https://pet-shop.s3.ir-thr-at1.arvanstorage.ir/delivery-services%2Ftipbox.jpg?versionId=',
    originCoordinates,
    availability,
    basePrice: 10000,
    packingPrice: 220000,
    pricePerKilometerInCity: 8000,
    pricePerKilometer: 10000,
    cityLeadDays: 0,
    outsideCityLeadDays: 1,
    isEnable: true,
  },
  {
    title: 'Post Pishtaz',
    title_fa: 'پست پیشتاز',
    logo: 'https://pet-shop.s3.ir-thr-at1.arvanstorage.ir/delivery-services%2Fpost-pishtaz.jpg?versionId=',
    originCoordinates,
    availability,
    basePrice: 6000,
    packingPrice: 180000,
    pricePerKilometerInCity: 4500,
    pricePerKilometer: 6000,
    cityLeadDays: 1,
    outsideCityLeadDays: 2,
    isEnable: true,
  },
];

try {
  await connectDB();
  await Promise.all(
    deliveryServices.map(({ title, ...data }) =>
      DeliveryServiceModel.findOneAndUpdate(
        { title },
        { $set: { title, ...data } },
        { upsert: true, returnDocument: 'after', runValidators: true },
      ),
    ),
  );
  console.log('سرویس‌های ارسال با موفقیت ثبت شدند');
} finally {
  await disconnectDB();
}
