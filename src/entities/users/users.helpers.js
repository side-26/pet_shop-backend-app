import { calculateDiscountAmount } from '#utils/price.helpers.js';

export const formatUserFullName = (
  user,
  firstNameKey = 'firstName',
  lastNameKey = 'lastName',
) => {
  const firstName = user?.[firstNameKey];
  const lastName = user?.[lastNameKey];

  return firstName || lastName
    ? `${firstName}${lastName ? ` ${lastName}` : ''}`
    : 'کاربر';
};

export const calculateCartPrices = (items = []) =>
  items.reduce(
    (prices, cartItem) => {
      if (!cartItem.item) return prices;

      const weight =
        cartItem.itemType === 'product'
          ? cartItem.item.weights?.id(cartItem.weight)
          : null;
      const price = weight?.price ?? cartItem.item.price;
      const discountPercentage =
        weight?.discountPercentage ?? cartItem.item.discountPercentage;
      const itemTotal = price * cartItem.quantity;
      return {
        totalPrice: prices.totalPrice + itemTotal,
        discountPrice:
          prices.discountPrice +
          calculateDiscountAmount(itemTotal, discountPercentage),
      };
    },
    { totalPrice: 0, discountPrice: 0 },
  );
