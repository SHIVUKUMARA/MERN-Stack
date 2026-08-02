class MongooseExecutor {
  constructor(model) {
    this.model = model;
  }

  async execute(config) {
    // let query = this.model.find(config.filter);
    let conditions = {
      ...config.filter,
    };

    // Search
    if (config.search) {
      const { keyword, fields } = config.search;

      conditions.$or = fields.map((field) => ({
        [field]: {
          $regex: keyword,
          $options: "i",
        },
      }));
    }

    let query = this.model.find(conditions);

    // Sort
    if (config.sort) {
      query = query.sort(config.sort);
    }

    // Select
    if (config.select) {
      query = query.select(config.select);
    }

    // Populate
    if (config.populate?.length) {
      config.populate.forEach((item) => {
        query = query.populate(item);
      });
    }

    // Pagination
    query = query.skip(config.pagination.skip).limit(config.pagination.limit);
    const [total, data] = await Promise.all([
      this.model.countDocuments(conditions),
      query,
    ]);

    const { page, limit } = config.pagination;
    const count = data.length;
    const totalPages = Math.ceil(total / limit);
    const pagination = {
      page,
      limit,
      count,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };

    return {
      data,
      pagination,
    };
  }
}

module.exports = MongooseExecutor;
