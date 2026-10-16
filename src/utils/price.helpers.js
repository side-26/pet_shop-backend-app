export const calculateDiscountAmount = (price, discountPercentage) =>
  price * (discountPercentage / 100);

export const calculateDiscountedPrice = (price, discountPercentage) =>
  price - calculateDiscountAmount(price, discountPercentage);
