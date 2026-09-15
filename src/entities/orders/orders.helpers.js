import { customAlphabet } from 'nanoid';

import { ORDER_IDENTIFIER } from '#configs/constants.js';

const numericNanoId = customAlphabet('0123456789', ORDER_IDENTIFIER.LENGTH);

export const generateNumericOrderIdentifier = () => numericNanoId();

export const snapshotOrderItem = (cartItem) => {
  const weight =
    cartItem.itemType === 'product'
      ? cartItem.item.weights.id(cartItem.weight)
      : null;
  return {
    item: cartItem.item._id,
    itemType: cartItem.itemType,
    quantity: cartItem.quantity,
    ...(weight && { weight: { metric: weight.metric, value: weight.value } }),
    price: weight?.price ?? cartItem.item.price,
    discountPercentage:
      weight?.discountPercentage ?? cartItem.item.discountPercentage,
    title: cartItem.item.title,
    mainImage: cartItem.item.mainImage,
    mainImageThumbnail: cartItem.item.mainImageThumbnail,
  };
};

export const snapshotUserAddress = (address) => ({
  sourceId: address._id,
  province: address.province,
  city: address.city,
  detailAddress: address.detailAddress,
  plate: address.plate,
  unit: address.unit ?? null,
  postalCode: address.postalCode,
  receiverIsMe: address.receiverIsMe,
  firstName: address.firstName,
  lastName: address.lastName,
  nationalCode: address.nationalCode,
  phoneNumber: address.phoneNumber,
});
