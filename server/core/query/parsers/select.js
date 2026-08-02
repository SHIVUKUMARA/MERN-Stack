const select = (query, options = {}) => {
  if (query.fields) {
    return query.fields.split(",").join(" ");
  }

  return options.defaultFields || null;
};

module.exports = select;
