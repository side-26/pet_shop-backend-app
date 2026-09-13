export const createPaginationResponse = ({
  result,
  totalItems,
  page,
  pageSize,
  filters,
  sort,
}) => {
  const totalPages = Math.ceil(totalItems / pageSize);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return {
    result,
    pagination: {
      currentPage: page,
      totalPages,
      totalItems,
      itemsPerPage: pageSize,
      hasNextPage,
      hasPrevPage,
      nextPage: hasNextPage ? page + 1 : null,
      prevPage: hasPrevPage ? page - 1 : null,
    },
    ...(filters !== undefined && { filters }),
    ...(sort !== undefined && { sort }),
  };
};
