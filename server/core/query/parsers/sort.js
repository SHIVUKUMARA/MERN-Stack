const sort = (query, options = {}) => {
  const defaultSort = options.defaultSort || "-createdAt"; // -created - means newest first

  if (!query.sort) {
    return defaultSort;
  }

  return query.sort.split(",").join(" ");
};

module.exports = sort;
