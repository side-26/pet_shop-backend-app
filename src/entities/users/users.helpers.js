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

export const formatCartItemDetails = (items = []) =>
  items
    .filter(({ item }) => item)
    .map((cartItem) => {
      const weight =
        cartItem.itemType === 'product'
          ? cartItem.item.weights?.id(cartItem.weight)
          : null;
      const price = weight?.price ?? cartItem.item.price;
      const discountPercentage =
        weight?.discountPercentage ?? cartItem.item.discountPercentage;

      return {
        id: cartItem._id.toString(),
        itemId: cartItem.item._id.toString(),
        itemType: cartItem.itemType,
        title: cartItem.item.title,
        mainImage: cartItem.item.mainImage,
        mainThumbnailImage:
          cartItem.item.mainThumbnailImage ?? cartItem.item.mainImageThumbnail,
        weight: weight
          ? {
              id: weight._id.toString(),
              value: weight.value,
              metric: weight.metric,
            }
          : null,
        cartQuantity: cartItem.quantity,
        discountPrice: calculateDiscountAmount(
          price * cartItem.quantity,
          discountPercentage,
        ),
        price,
        productAllowQuantity: weight?.quantity ?? cartItem.item.quantity,
      };
    });
