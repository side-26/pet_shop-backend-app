import { STATUES } from '#configs/constants.js';
import { setErrorResponse } from '#utils/helpers.js';

import { PetTypeModel } from '#entities/petTypes/petTypes.model.js';

import { validatePetProperties } from './pet.helpers.js';
import { PetModel } from './pet.model.js';

export class PetService {
  static async findPetType(id) {
    const petType = await PetTypeModel.findOne({ _id: id, isEnabled: true });

    if (!petType) {
      setErrorResponse(STATUES.BAD_FORM_VALIDATION, {
        message: 'The selected pet type does not exist or is disabled',
        code: 'PET_TYPE_NOT_AVAILABLE',
      });
    }

    return petType;
  }

  static async findById(id) {
    const pet = await PetModel.findById(id);

    if (!pet) {
      setErrorResponse(STATUES.NOT_FOUND, {
        message: 'Pet not found',
        code: 'PET_NOT_FOUND',
      });
    }

    return pet;
  }

  static async create(data, userId) {
    const petType = await this.findPetType(data.petType);
    const properties = validatePetProperties(
      petType.propertyDefinitions,
      data.properties,
    );

    return PetModel.create({ ...data, properties, createdBy: userId });
  }

  static async update(id, data, userId) {
    const pet = await this.findById(id);
    const petTypeId = data.petType || pet.petType;
    const petType = await this.findPetType(petTypeId);
    const currentProperties =
      pet.properties instanceof Map
        ? Object.fromEntries(pet.properties)
        : pet.properties || {};
    const properties = validatePetProperties(
      petType.propertyDefinitions,
      data.properties === undefined ? currentProperties : data.properties,
    );

    Object.assign(pet, data, { properties, updatedBy: userId });
    return pet.save();
  }

  static async delete(id) {
    const pet = await PetModel.findByIdAndDelete(id);

    if (!pet) {
      setErrorResponse(STATUES.NOT_FOUND, {
        message: 'Pet not found',
        code: 'PET_NOT_FOUND',
      });
    }

    return pet;
  }

  static findAll({ petType, includeDisabled = false } = {}) {
    const query = {};
    if (petType) query.petType = petType;
    if (!includeDisabled) query.isEnabled = true;
    return PetModel.find(query).sort({ createdAt: -1 });
  }

  static format(pet) {
    if (!pet) return null;
    const value = typeof pet.toObject === 'function' ? pet.toObject() : pet;

    return {
      id: value._id,
      name: value.name,
      petType: value.petType,
      age: value.age,
      description: value.description,
      properties:
        value.properties instanceof Map
          ? Object.fromEntries(value.properties)
          : value.properties,
      isEnabled: value.isEnabled,
      createdAt: value.createdAt,
      updatedAt: value.updatedAt,
    };
  }

  static formatMany(pets) {
    return pets.map((pet) => this.format(pet));
  }
}
