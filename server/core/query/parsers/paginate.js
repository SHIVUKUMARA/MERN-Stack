const paginate = (query, options = {}) => {
  const defaultPage = options.defaultPage || 1;
  const defaultLimit = options.defaultLimit || 10;
  const maxLimit = options.maxLimit || 100;

  const page = Math.max(Number(query.page) || defaultPage, 1);
  let limit = Number(query.limit) || defaultLimit;
  limit = Math.min(Math.max(limit, 1), maxLimit);

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
};

module.exports = paginate;
