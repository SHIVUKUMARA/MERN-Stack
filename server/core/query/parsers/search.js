const search = (query, options = {}) => {
  const keyword = query.search?.trim();
  if (!keyword) {
    return null;
  }

  return {
    keyword,
    fields: options.searchableFields || [],
  };
};

module.exports = search;
