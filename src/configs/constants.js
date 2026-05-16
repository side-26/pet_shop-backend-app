module.exports = {
  ROUTES: {
    users: {
      getAll: '/users/all',
      getAllPaginate: '/users/paginate',
      getUserById: '/users/:id',
      createUser: '/users',
      updateUser: '/users/edit/:id',
      deleteUser: '/users/delete/:id',
    },
    orders: {
      getAll: '/orders/all',
      getAllPaginate: '/orders/paginate',
      getOrderById: '/orders/:id',
      getOrderByUser: '/orders/:userId',
      createOrder: '/orders',
      updateOrder: '/orders/edit/:id',
      deleteOrder: '/orders/delete/:id',
    },
    products: {
      getAll: '/products/all',
      getAllPaginate: '/products/paginate',
      getOrderById: '/products/:id',
      getOrderByUser: '/products/:userId',
      createOrder: '/products',
      updateOrder: '/products/edit/:id',
      deleteOrder: '/products/delete/:id',
    },
  },
};
