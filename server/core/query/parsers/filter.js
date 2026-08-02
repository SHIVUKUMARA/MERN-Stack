const filter = (query, options = {}) => {
  const filters = { ...query };
  const allowedFields = options.filterableFields || [];
  const reservedFields = [
    "page",
    "sort",
    "limit",
    "fields",
    "search",
    "populate",
  ];

  reservedFields.forEach((field) => delete filters[field]);

  const conditions = {
    ...(options.defaultFilter || {}),
  };

  const operators = {
    gt: "$gt",
    gte: "$gte",
    lt: "$lt",
    lte: "$lte",
    ne: "$ne",
    in: "$in",
    nin: "$nin",
  };

  for (const key in filters) {
    const value = filters[key];

    // Match field[operator]
    const match = key.match(/^(.+)\[(.+)\]$/);

    if (match) {
      const [, field, operator] = match;

      if (allowedFields.length && !allowedFields.includes(field)) {
        continue;
      }

      if (operators[operator]) {
        if (!conditions[field]) {
          conditions[field] = {};
        }

        let parsedValue = value;

        // Number
        if (!isNaN(value)) {
          parsedValue = Number(value);
        }

        // Boolean
        if (value === "true") parsedValue = true;
        if (value === "false") parsedValue = false;

        // Date
        if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
          parsedValue = new Date(value);
        }

        // in / nin
        if (operator === "in" || operator === "nin") {
          parsedValue = value.split(",");
        }

        conditions[field][operators[operator]] = parsedValue;
      }
    } else {
      if (!allowedFields.length || allowedFields.includes(key)) {
        conditions[key] = value;
      }
    }
  }
  console.log(conditions);
  return conditions;
};

module.exports = filter;
