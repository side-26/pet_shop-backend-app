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

      const itemTotal = cartItem.item.price * cartItem.quantity;
      return {
        totalPrice: prices.totalPrice + itemTotal,
        discountPrice:
          prices.discountPrice +
          itemTotal * (cartItem.item.discountPercentage / 100),
      };
    },
    { totalPrice: 0, discountPrice: 0 },
  );
