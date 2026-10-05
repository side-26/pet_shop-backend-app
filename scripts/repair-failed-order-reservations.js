import connectDB, { disconnectDB } from '#configs/db.config.js';
import {
  ORDER_PAYMENT_STATUSES,
  ORDER_RESERVATION_STATES,
  PAYMENT_STATUSES,
  TERMINAL_PAYMENT_FAILURE_STATUSES,
  USER_ITEM_TYPES,
} from '#configs/constants.js';
import { OrderModel } from '#entities/orders/orders.model.js';
import { PaymentModel } from '#entities/payments/payments.model.js';
import { ProductService } from '#entities/products/products.service.js';

const apply = process.argv.includes('--apply');

const getFailedReservedOrderIds = async () => {
  const now = new Date();
  const terminalPaymentOrderIds = await PaymentModel.distinct('order', {
    order: { $ne: null },
    status: { $in: TERMINAL_PAYMENT_FAILURE_STATUSES },
  });
  const orders = await OrderModel.find({
    inventoryReservationState: ORDER_RESERVATION_STATES.RESERVED,
    paymentStatus: { $ne: ORDER_PAYMENT_STATUSES.PAID },
    $or: [
      { paymentStatus: ORDER_PAYMENT_STATUSES.FAILED },
      { _id: { $in: terminalPaymentOrderIds } },
      {
        paymentStatus: ORDER_PAYMENT_STATUSES.PENDING,
        paymentExpiresAt: { $lte: now },
      },
    ],
  })
    .select('_id')
    .lean();

  return orders.map(({ _id }) => _id);
};

const releaseOrderReservation = async (orderId) => {
  const session = await OrderModel.db.startSession();
  try {
    await session.withTransaction(async () => {
      const order = await OrderModel.findOne({
        _id: orderId,
        inventoryReservationState: ORDER_RESERVATION_STATES.RESERVED,
        paymentStatus: { $ne: ORDER_PAYMENT_STATUSES.PAID },
      }).session(session);
      if (!order) return;

      for (const item of order.items) {
        if (item.itemType !== USER_ITEM_TYPES.PRODUCT || !item.sourceWeightId) {
          continue;
        }
        const product = await ProductService.restoreWeightStock(
          item.item,
          item.sourceWeightId,
          item.quantity,
          session,
        );
        if (!product) {
          throw new Error(
            `وزن محصول سفارش ${orderId.toString()} برای بازگردانی موجودی یافت نشد`,
          );
        }
      }

      await PaymentModel.updateMany(
        { order: order._id, status: PAYMENT_STATUSES.PENDING },
        { $set: { status: PAYMENT_STATUSES.FAILED, paidAt: null } },
        { session },
      );
      await OrderModel.updateOne(
        {
          _id: order._id,
          inventoryReservationState: ORDER_RESERVATION_STATES.RESERVED,
        },
        {
          $set: {
            inventoryReservationState: ORDER_RESERVATION_STATES.RELEASED,
            inventoryReleasedAt: new Date(),
            paymentStatus: ORDER_PAYMENT_STATUSES.FAILED,
          },
        },
        { session },
      );
    });
  } finally {
    await session.endSession();
  }
};

try {
  await connectDB();
  const orderIds = await getFailedReservedOrderIds();
  if (!apply) {
    console.log(
      `حالت بررسی: ${orderIds.length} سفارش ناموفق با رزرو فعال یافت شد. برای اعمال، دستور را با --apply اجرا کنید.`,
    );
  } else {
    for (const orderId of orderIds) {
      await releaseOrderReservation(orderId);
    }
    console.log(
      `${orderIds.length} سفارش ناموفق بررسی و رزرو موجودی آن‌ها با موفقیت آزاد شد`,
    );
  }
} finally {
  await disconnectDB();
}
