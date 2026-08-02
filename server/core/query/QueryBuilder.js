const {
  filter,
  paginate,
  populate,
  search,
  select,
  sort,
} = require("./parsers");

class QueryBuilder {
  constructor(query, options = {}) {
    this.query = query;

    this.options = {
      searchableFields: [],
      filterableFields: [],
      defaultFilter: {},
      defaultPopulate: [],
      defaultFields: null,
      defaultSort: "-createdAt",
      defaultPage: 1,
      defaultLimit: 10,
      maxLimit: 100,
      ...options,
    };

    this.config = {
      filter: {},
      search: null,
      sort: this.options.defaultSort,
      select: this.options.defaultFields,
      populate: this.options.defaultPopulate,
      pagination: {
        page: this.options.defaultPage,
        limit: this.options.defaultLimit,
        skip: 0,
      },
    };
  }
  filter() {
    this.config.filter = filter(this.query, {
      filterableFields: this.options.filterableFields,
      defaultFilter: this.options.defaultFilter,
    });
    return this;
  }
  search() {
    this.config.search = search(this.query, {
      searchableFields: this.options.searchableFields,
    });

    return this;
  }
  sort() {
    this.config.sort = sort(this.query, {
      defaultSort: this.options.defaultSort,
    });

    return this;
  }
  select() {
    this.config.select = select(this.query, {
      defaultFields: this.options.defaultFields,
    });

    return this;
  }
  populate() {
    this.config.populate = populate(this.query, {
      defaultPopulate: this.options.defaultPopulate,
    });

    return this;
  }
  paginate() {
    this.config.pagination = paginate(this.query, {
      defaultPage: this.options.defaultPage,
      defaultLimit: this.options.defaultLimit,
      maxLimit: this.options.maxLimit,
    });

    return this;
  }
  build() {
    return this.config;
  }
}

module.exports = QueryBuilder;
