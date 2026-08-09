import { ProductModel } from '#entities/products/products.model.js';

import { formatLanding } from './landing.helpers.js';
import { LandingModel } from './landing.model.js';

const LANDING_KEY = 'main';

export class LandingService {
  static async findConfiguration() {
    return LandingModel.findOne({ key: LANDING_KEY });
  }

  static async get() {
    const landing = await this.findConfiguration();
    const limit = landing?.featuredProductLimit || 8;
    const products = await ProductModel.find({
      isEnabled: true,
      stock: { $gt: 0 },
    })
      .sort({ createdAt: -1 })
      .limit(limit);
    return formatLanding(landing, products);
  }

  static async update(data, userId) {
    const landing = await LandingModel.findOneAndUpdate(
      { key: LANDING_KEY },
      {
        $set: { ...data, updatedBy: userId },
        $setOnInsert: { key: LANDING_KEY },
      },
      { upsert: true, returnDocument: 'after', runValidators: true },
    );
    return formatLanding(landing);
  }
}
