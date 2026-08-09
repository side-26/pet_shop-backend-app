import { ERROR_CODES, STATUES } from '#configs/constants.js';
import { getPaginationData, setErrorResponse } from '#utils/helpers.js';

import {
  buildBreedFilter,
  escapeBreedRegex,
  formatBreed,
} from './breeds.helpers.js';
import { BreedModel } from './breeds.model.js';

export class BreedService {
  static escapeRegex(value = '') {
    return escapeBreedRegex(value);
  }

  static async findOne({ title, excludeId } = {}) {
    const query = {};
    if (title) {
      query.title = {
        $regex: `^${this.escapeRegex(title)}$`,
        $options: 'i',
      };
    }
    if (excludeId) query._id = { $ne: excludeId };
    return BreedModel.findOne(query);
  }

  static async findById(id, throwOnNotFound = true) {
    const breed = await BreedModel.findById(id);
    if (!breed && throwOnNotFound) {
      setErrorResponse(STATUES.NOT_FOUND, {
        message: 'Breed not found',
        code: ERROR_CODES.BREED_NOT_FOUND,
      });
    }
    return breed;
  }

  static async create(data, userId) {
    const existingBreed = await this.findOne({ title: data.title });
    if (existingBreed) {
      setErrorResponse(STATUES.BAD_FORM_VALIDATION, {
        message: 'A breed with this title already exists',
        code: ERROR_CODES.BREED_ALREADY_EXISTS,
      });
    }
    return BreedModel.create({ ...data, createdBy: userId });
  }

  static async update(id, data, userId) {
    await this.findById(id);
    const existingBreed = await this.findOne({
      title: data.title,
      excludeId: id,
    });
    if (existingBreed) {
      setErrorResponse(STATUES.BAD_FORM_VALIDATION, {
        message: 'A breed with this title already exists',
        code: ERROR_CODES.BREED_ALREADY_EXISTS,
      });
    }
    const breed = await BreedModel.findByIdAndUpdate(
      id,
      { $set: { ...data, updatedBy: userId } },
      { returnDocument: 'after', runValidators: true },
    );
    if (!breed) {
      setErrorResponse(STATUES.NOT_FOUND, {
        message: 'Breed not found',
        code: ERROR_CODES.BREED_NOT_FOUND,
      });
    }
    return breed;
  }

  static async setEnableStatus(id, enable, userId) {
    await this.findById(id);
    const breed = await BreedModel.findByIdAndUpdate(
      id,
      { $set: { enable, updatedBy: userId } },
      { returnDocument: 'after', runValidators: true },
    );
    if (!breed) {
      setErrorResponse(STATUES.NOT_FOUND, {
        message: 'Breed not found',
        code: ERROR_CODES.BREED_NOT_FOUND,
      });
    }
    return breed;
  }

  static enable(id, userId) {
    return this.setEnableStatus(id, true, userId);
  }

  static disable(id, userId) {
    return this.setEnableStatus(id, false, userId);
  }

  static async delete(id) {
    const breed = await BreedModel.findByIdAndDelete(id);
    if (!breed) {
      setErrorResponse(STATUES.NOT_FOUND, {
        message: 'Breed not found',
        code: ERROR_CODES.BREED_NOT_FOUND,
      });
    }
    return breed;
  }

  static findAll(queryParams = {}) {
    return BreedModel.find(buildBreedFilter(queryParams)).sort({ title: 1 });
  }

  static findAllWithPagination(queryParams = {}) {
    const filter = {
      ...buildBreedFilter(queryParams),
      page: queryParams.page,
      limit: queryParams.limit,
      sort: queryParams.sort,
    };
    return getPaginationData(BreedModel, filter, '', (error) =>
      setErrorResponse(STATUES.OTHER_PROBLEM, {
        message: 'Unable to retrieve breeds',
        error: String(error),
      }),
    );
  }

  static format(breed) {
    return formatBreed(breed);
  }

  static formatMany(breeds) {
    return breeds.map(formatBreed);
  }
}
