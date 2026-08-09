export const buildOrderItems = (requestedItems, products) => {
  const productById = new Map(
    products.map((product) => [product._id.toString(), product]),
  );

  return requestedItems.map((item) => {
    const product = productById.get(item.product);
    return {
      product: product._id,
      title: product.title,
      quantity: item.quantity,
      unitPrice: product.price,
      lineTotal: product.price * item.quantity,
    };
  });
};

export const calculateOrderTotal = (items) =>
  items.reduce((total, item) => total + item.lineTotal, 0);

export const formatOrder = (order) => {
  if (!order) return null;
  const value = typeof order.toObject === 'function' ? order.toObject() : order;
  return {
    id: value._id,
    user: value.user,
    items: value.items,
    totalAmount: value.totalAmount,
    shippingAddress: value.shippingAddress,
    status: value.status,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
};
