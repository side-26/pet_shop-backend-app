import { customAlphabet } from 'nanoid';

import { ORDER_IDENTIFIER } from '#configs/constants.js';

const numericNanoId = customAlphabet('0123456789', ORDER_IDENTIFIER.LENGTH);

export const generateNumericOrderIdentifier = () => numericNanoId();

export const snapshotOrderItem = (cartItem) => ({
  item: cartItem.item._id,
  itemType: cartItem.itemType,
  quantity: cartItem.quantity,
  price: cartItem.item.price,
  discountPercentage: cartItem.item.discountPercentage,
  title: cartItem.item.title,
  mainImage: cartItem.item.mainImage,
  mainImageThumbnail: cartItem.item.mainImageThumbnail,
});

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
