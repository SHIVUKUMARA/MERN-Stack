const populate = (query, options = {}) => {
  if (!query.populate) {
    return options.defaultPopulate || [];
  }

  return query.populate.split(",").map((path) => ({ path: path.trim() }));
};

module.exports = populate;
